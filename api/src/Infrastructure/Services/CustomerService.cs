using api.Application.DTOs.CustomerDto;
using api.Application.Exceptions;
using api.src.Application.Mapping;
using api.src.Application.Interfaces;
using api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace api.src.Infrastructure.Services;

public class CustomerService : ICustomerService
{
    private readonly AppDbContext _context;

    public CustomerService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<CustomerDto>> GetAllCustomersAsync(Guid tenantId, string? currentUserId = null, bool staffOnly = false)
    {
        int? staffId = staffOnly ? await ResolveStaffIdForUserAsync(tenantId, currentUserId) : null;

        var query = _context.Customers
            .Where(c => c.TenantId == tenantId);

        if (staffId.HasValue)
            query = query.Where(c => c.Bookings!.Any(b => b.StaffId == staffId.Value));

        var customers = staffId.HasValue
            ? await query
                .Include(c => c.Bookings!.Where(b => b.StaffId == staffId.Value))
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync()
            : await query
                .Include(c => c.Bookings)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

        return customers.ToDtoList();
    }

    public async Task<CustomerDto> GetCustomerByIdAsync(int id, Guid tenantId, string? currentUserId = null, bool staffOnly = false)
    {
        int? staffId = staffOnly ? await ResolveStaffIdForUserAsync(tenantId, currentUserId) : null;

        var query = _context.Customers
            .Where(c => c.Id == id && c.TenantId == tenantId);

        if (staffId.HasValue)
            query = query.Where(c => c.Bookings!.Any(b => b.StaffId == staffId.Value));

        var customer = staffId.HasValue
            ? await query.Include(c => c.Bookings!.Where(b => b.StaffId == staffId.Value)).FirstOrDefaultAsync()
            : await query.Include(c => c.Bookings).FirstOrDefaultAsync();

        if (customer == null)
            throw new NotFoundException("Customer not found");

        return customer.ToDto();
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerDto createCustomerDto, Guid tenantId)
    {
        var tenantExists = await _context.Tenants.AnyAsync(t => t.Id == tenantId);
        if (!tenantExists)
            throw new NotFoundException("Tenant not found");

        if (string.IsNullOrWhiteSpace(createCustomerDto.Email))
            throw new BadRequestException("Email is required");
        if (string.IsNullOrWhiteSpace(createCustomerDto.Name))
            throw new BadRequestException("Name is required");

        var normalizedEmail = createCustomerDto.Email.Trim().ToLowerInvariant();
        var existingCustomerByEmail = await _context.Customers
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantId)
            .ToListAsync();
        var duplicateEmail = existingCustomerByEmail.Any(c =>
        {
            var parsed = ParseCustomerEmailFromNotes(c.Notes);
            return !string.IsNullOrWhiteSpace(parsed) &&
                   parsed.Equals(normalizedEmail, StringComparison.OrdinalIgnoreCase);
        });

        if (duplicateEmail)
            throw new BadRequestException("A customer already exists for this email");

        var customer = createCustomerDto.ToEntity(tenantId);
        customer.UserId = null;
        customer.Notes = CustomerMapper.BuildCustomerProfileNotes(
            createCustomerDto.Name,
            createCustomerDto.Email,
            createCustomerDto.Notes);

        _context.Customers.Add(customer);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg &&
                                           pg.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            throw new BadRequestException("A customer with this email/user already exists");
        }

        return await GetCustomerByIdAsync(customer.Id, tenantId);
    }

    public async Task<CustomerDto> UpdateCustomerAsync(int id, UpdateCustomerDto updateCustomerDto, Guid tenantId)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (customer == null)
            throw new NotFoundException("Customer not found");

        updateCustomerDto.UpdateEntity(customer);
        _context.Customers.Update(customer);
        await _context.SaveChangesAsync();

        return await GetCustomerByIdAsync(id, tenantId);
    }

    public async Task<bool> DeleteCustomerAsync(int id, Guid tenantId)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (customer == null)
            throw new NotFoundException("Customer not found");

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();
        return true;
    }

    private static string? ParseCustomerEmailFromNotes(string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes))
            return null;

        if (notes.StartsWith("CustomerProfile|"))
        {
            var parts = notes.Split('|');
            if (parts.Length >= 3)
                return parts[2].Trim().ToLowerInvariant();
        }

        if (notes.StartsWith("PublicBooking|"))
        {
            var parts = notes.Split('|');
            if (parts.Length >= 4)
                return parts[3].Trim().ToLowerInvariant();
        }

        return null;
    }

    private async Task<int> ResolveStaffIdForUserAsync(Guid tenantId, string? currentUserId)
    {
        if (string.IsNullOrWhiteSpace(currentUserId))
            throw new ForbiddenException("Staff profile not found for current user");

        var staff = await _context.Staff
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.UserId == currentUserId && s.IsActive);

        if (staff == null)
            throw new ForbiddenException("Staff profile not found for current user");

        return staff.Id;
    }
}
