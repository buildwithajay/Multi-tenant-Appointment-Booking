using api.Application.DTOs.BookingDto;
using api.Application.Exceptions;
using api.Domain.Models;
using api.Infrastructure.Data;
using api.src.Application.DTOs.NotificationDto;
using api.src.Application.Interfaces;
using api.src.Application.Mapping;
using api.src.Domain.Enums;
using api.src.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace api.src.Infrastructure.Services;

public class BookingService : IBookingService
{
    private readonly AppDbContext _context;
    private readonly IBookingNotificationQueue _notificationQueue;
    private readonly ILogger<BookingService> _logger;

    public BookingService(
        AppDbContext context,
        IBookingNotificationQueue notificationQueue,
        ILogger<BookingService> logger)
    {
        _context = context;
        _notificationQueue = notificationQueue;
        _logger = logger;
    }

    public async Task<List<BookingDto>> GetAllBookingsAsync(Guid tenantId, string? currentUserId = null, bool staffOnly = false)
    {
        int? staffId = staffOnly ? await ResolveStaffIdForUserAsync(tenantId, currentUserId) : null;

        var query = _context.Bookings
            .Include("Customer.User")
            .Include(b => b.Service)
            .Include("Staff.User")
            .Where(b => b.TenantId == tenantId);

        if (staffId.HasValue)
            query = query.Where(b => b.StaffId == staffId.Value);

        var bookings = await query
            .OrderByDescending(b => b.StartTime)
            .ToListAsync();

        return bookings.ToDtoList();
    }

    public async Task<BookingDto> GetBookingByIdAsync(int id, Guid tenantId, string? currentUserId = null, bool staffOnly = false)
    {
        int? staffId = staffOnly ? await ResolveStaffIdForUserAsync(tenantId, currentUserId) : null;

        var query = _context.Bookings
            .Include("Customer.User")
            .Include(b => b.Service)
            .Include("Staff.User")
            .Where(b => b.Id == id && b.TenantId == tenantId);

        if (staffId.HasValue)
            query = query.Where(b => b.StaffId == staffId.Value);

        var booking = await query.FirstOrDefaultAsync();

        if (booking == null)
            throw new NotFoundException("Booking not found");

        return booking.ToDto();
    }

    public async Task<BookingDto> CreateBookingAsync(CreateBookingDto createBookingDto, Guid tenantId)
    {
        if (!createBookingDto.ServiceId.HasValue || createBookingDto.ServiceId.Value <= 0)
            throw new BadRequestException("Service is required");
        if (!createBookingDto.StaffId.HasValue || createBookingDto.StaffId.Value <= 0)
            throw new BadRequestException("Staff is required");
        if (!createBookingDto.StartTime.HasValue)
            throw new BadRequestException("Start time is required");

        var serviceId = createBookingDto.ServiceId.Value;
        var staffId = createBookingDto.StaffId.Value;
        var startTime = createBookingDto.StartTime.Value;

        var service = await _context.Services
            .FirstOrDefaultAsync(s => s.Id == serviceId && s.TenantId == tenantId);
        if (service == null)
            throw new NotFoundException("Service not found");

        var customerId = await ResolveOrCreateCustomerIdAsync(createBookingDto, tenantId);

        var staffExists = await _context.Staff
            .AnyAsync(s => s.Id == staffId && s.TenantId == tenantId);
        if (!staffExists)
            throw new NotFoundException("Staff not found");

        var staffCanPerformService = await _context.ServiceStaff
            .AnyAsync(ss => ss.StaffId == staffId && ss.ServiceId == serviceId);
        if (!staffCanPerformService)
            throw new BadRequestException("Selected staff is not assigned to this service");

        var endTime = createBookingDto.EndTime ?? startTime.AddMinutes(service.DurationMinutes);
        if (endTime <= startTime)
            throw new BadRequestException("End time must be greater than start time");

        await ValidateBookingPlanLimitAsync(tenantId, startTime, null);
        await ValidateStaffAvailabilityAsync(staffId, startTime, endTime, null);

        var booking = createBookingDto.ToEntity(tenantId, endTime);
        booking.ServiceId = serviceId;
        booking.StaffId = staffId;
        booking.StartTime = startTime;
        booking.CustomerId = customerId;
        _context.Bookings.Add(booking);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg &&
                                           pg.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            throw new BadRequestException("Could not create booking due to duplicate or invalid related data");
        }
        catch (DbUpdateException ex)
        {
            var details = ex.InnerException?.Message ?? ex.Message;
            throw new BadRequestException($"Failed to create booking: {details}");
        }

        await EnqueueBookingConfirmationAsync(tenantId, booking);

        return await GetBookingByIdAsync(booking.Id, tenantId);
    }

    private async Task<int> ResolveOrCreateCustomerIdAsync(CreateBookingDto dto, Guid tenantId)
    {
        if (dto.CustomerId.HasValue)
        {
            var customerExists = await _context.Customers
                .AnyAsync(c => c.Id == dto.CustomerId.Value && c.TenantId == tenantId);
            if (!customerExists)
                throw new NotFoundException("Customer not found");
            return dto.CustomerId.Value;
        }

        if (string.IsNullOrWhiteSpace(dto.CustomerName))
            throw new BadRequestException("Customer name is required");
        if (string.IsNullOrWhiteSpace(dto.CustomerEmail))
            throw new BadRequestException("Customer email is required");

        var normalizedEmail = dto.CustomerEmail.Trim().ToLowerInvariant();
        var existingCustomers = await _context.Customers
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantId)
            .ToListAsync();

        var existing = existingCustomers.FirstOrDefault(c =>
        {
            var email = ParseEmailFromCustomerNotes(c.Notes);
            return !string.IsNullOrWhiteSpace(email) &&
                   email.Equals(normalizedEmail, StringComparison.OrdinalIgnoreCase);
        });
        if (existing != null)
            return existing.Id;

        var customer = new Customer
        {
            TenantId = tenantId,
            UserId = null,
            Notes = CustomerMapper.BuildCustomerProfileNotes(dto.CustomerName, dto.CustomerEmail, null),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Customers.Add(customer);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg &&
                                           pg.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            throw new BadRequestException("A customer with this email already exists");
        }
        catch (DbUpdateException ex)
        {
            var details = ex.InnerException?.Message ?? ex.Message;
            throw new BadRequestException($"Failed to create customer profile: {details}");
        }
        return customer.Id;
    }

    private static string? ParseEmailFromCustomerNotes(string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes))
            return null;
        var parts = notes.Split('|');
        if (notes.StartsWith("CustomerProfile|") && parts.Length >= 3)
            return parts[2].Trim().ToLowerInvariant();
        if (notes.StartsWith("PublicBooking|") && parts.Length >= 4)
            return parts[3].Trim().ToLowerInvariant();
        return null;
    }

    public async Task<BookingDto> UpdateBookingAsync(int id, UpdateBookingDto updateBookingDto, Guid tenantId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Service)
            .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId);
        if (booking == null)
            throw new NotFoundException("Booking not found");

        var customerId = updateBookingDto.CustomerId ?? booking.CustomerId;
        var serviceId = updateBookingDto.ServiceId ?? booking.ServiceId;
        var staffId = updateBookingDto.StaffId ?? booking.StaffId;
        var startTime = updateBookingDto.StartTime ?? booking.StartTime;

        var service = booking.Service;
        if (serviceId != booking.ServiceId || service == null)
        {
            service = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId && s.TenantId == tenantId);
        }
        if (service == null)
            throw new NotFoundException("Service not found");

        var endTime = updateBookingDto.EndTime ?? booking.EndTime;
        if (updateBookingDto.StartTime.HasValue && !updateBookingDto.EndTime.HasValue)
        {
            endTime = startTime.AddMinutes(service.DurationMinutes);
        }

        if (endTime <= startTime)
            throw new BadRequestException("End time must be greater than start time");

        await ValidateBookingPlanLimitAsync(tenantId, startTime, booking.Id);
        var customerExists = await _context.Customers
            .AnyAsync(c => c.Id == customerId && c.TenantId == tenantId);
        if (!customerExists)
            throw new NotFoundException("Customer not found");

        var staffExists = await _context.Staff
            .AnyAsync(s => s.Id == staffId && s.TenantId == tenantId);
        if (!staffExists)
            throw new NotFoundException("Staff not found");

        var staffCanPerformService = await _context.ServiceStaff
            .AnyAsync(ss => ss.StaffId == staffId && ss.ServiceId == serviceId);
        if (!staffCanPerformService)
            throw new BadRequestException("Selected staff is not assigned to this service");

        await ValidateStaffAvailabilityAsync(staffId, startTime, endTime, booking.Id);

        booking.CustomerId = customerId;
        booking.ServiceId = serviceId;
        booking.StaffId = staffId;
        booking.StartTime = startTime;
        booking.EndTime = endTime;
        booking.Status = updateBookingDto.Status ?? booking.Status;
        booking.PaymentStatus = updateBookingDto.PaymentStatus ?? booking.PaymentStatus;
        booking.Notes = updateBookingDto.Notes ?? booking.Notes;
        booking.UpdatedAt = DateTime.UtcNow;

        _context.Bookings.Update(booking);
        await _context.SaveChangesAsync();

        return await GetBookingByIdAsync(id, tenantId);
    }

    public async Task<bool> DeleteBookingAsync(int id, Guid tenantId)
    {
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId);
        if (booking == null)
            throw new NotFoundException("Booking not found");

        _context.Bookings.Remove(booking);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task ValidateStaffAvailabilityAsync(int staffId, DateTime startTime, DateTime endTime, int? excludeBookingId)
    {
        var hasConflict = await _context.Bookings.AnyAsync(b =>
            b.StaffId == staffId &&
            b.Status != BookingStatus.Cancelled &&
            (!excludeBookingId.HasValue || b.Id != excludeBookingId.Value) &&
            b.StartTime < endTime &&
            startTime < b.EndTime);

        if (hasConflict)
            throw new BadRequestException("Staff already has a booking in the selected time range");
    }

    private async Task ValidateBookingPlanLimitAsync(Guid tenantId, DateTime bookingStartTime, int? excludeBookingId)
    {
        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null)
            throw new NotFoundException("Tenant not found");

        var monthlyLimit = SubscriptionPlanLimits.GetMonthlyBookingLimit(tenant.SubscriptionPlan);
        if (!monthlyLimit.HasValue) return;

        var monthStart = new DateTime(bookingStartTime.Year, bookingStartTime.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextMonthStart = monthStart.AddMonths(1);

        var currentMonthBookingCount = await _context.Bookings
            .Where(b =>
                b.TenantId == tenantId &&
                (!excludeBookingId.HasValue || b.Id != excludeBookingId.Value) &&
                b.StartTime >= monthStart &&
                b.StartTime < nextMonthStart)
            .CountAsync();

        if (currentMonthBookingCount >= monthlyLimit.Value)
            throw new BadRequestException($"Your {tenant.SubscriptionPlan} plan allows up to {monthlyLimit.Value} bookings per month.");
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

    private async Task EnqueueBookingConfirmationAsync(Guid tenantId, Booking booking)
    {
        try
        {
            var customer = await _context.Customers
                .IgnoreQueryFilters()
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == booking.CustomerId && c.TenantId == tenantId);
            var service = await _context.Services
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == booking.ServiceId && s.TenantId == tenantId);
            var staff = await _context.Staff
                .IgnoreQueryFilters()
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == booking.StaffId && s.TenantId == tenantId);
            var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);

            if (customer == null || service == null || staff == null || tenant == null)
                return;

            var toEmail = customer.User?.Email ?? ParseEmailFromCustomerNotes(customer.Notes);
            if (string.IsNullOrWhiteSpace(toEmail))
                return;

            var toName = customer.User != null
                ? $"{customer.User.FirstName} {customer.User.LastName}".Trim()
                : ParseCustomerNameFromNotes(customer.Notes) ?? "Customer";

            var staffName = staff.User == null
                ? $"Staff #{staff.Id}"
                : $"{staff.User.FirstName} {staff.User.LastName}".Trim();

            await _notificationQueue.QueueBookingConfirmationAsync(new BookingConfirmationEmailJob
            {
                ToEmail = toEmail,
                ToName = string.IsNullOrWhiteSpace(toName) ? "Customer" : toName,
                TenantName = tenant.Name,
                ServiceName = service.Name ?? string.Empty,
                StaffName = staffName,
                StartTime = booking.StartTime,
                EndTime = booking.EndTime,
                Notes = booking.Notes
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enqueue booking confirmation email for booking {BookingId}", booking.Id);
        }
    }

    private static string? ParseCustomerNameFromNotes(string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes))
            return null;
        var parts = notes.Split('|');
        if (notes.StartsWith("CustomerProfile|") && parts.Length >= 2)
            return parts[1].Trim();
        if (notes.StartsWith("PublicBooking|") && parts.Length >= 3)
            return $"{parts[1]} {parts[2]}".Trim();
        return null;
    }
}
