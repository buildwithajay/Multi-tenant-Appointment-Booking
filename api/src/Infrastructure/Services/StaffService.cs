using api.Application.DTOs.StaffDto;
using api.Application.Mapping;
using api.Domain.Models;
using api.Infrastructure.Data;
using api.src.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using api.Application.Exceptions;
using api.src.Domain.Enums;

namespace api.src.Infrastructure.Services;

public class StaffService: IStaffService
{
    private readonly AppDbContext _context;
    private readonly UserManager<User> _userManager;

    public StaffService(AppDbContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<List<StaffDto>> GetAllAsync(Guid tenantId)
    {
        var staff = await _context.Staff
                                .Include(s=>s.User)
                                .Include(s=>s.ServiceStaff)!
                                .ThenInclude(ss => ss.Service)
                                .Where(s => s.TenantId == tenantId)
                                .OrderBy(s=>s.CreatedAt)
                                .ToListAsync();
        return staff.TodtoList();
    }

    public async Task<StaffDto> GetStaffByIdAsync(Guid tenantId, int id)
    {
        var staff = await _context.Staff
            .Include(s=>s.User)
            .Include(s=>s.ServiceStaff)!
            .ThenInclude(ss=>ss.Service)
            .FirstOrDefaultAsync(s=>s.Id == id && s.TenantId==tenantId);
        return staff == null ? throw new Exception("staff member not found") : staff.ToDto();
    }

    public async Task<StaffDto> CreateAsync(CreateStaffDto staffDto, Guid tenantId)
    {
        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null)
            throw new NotFoundException("tenant not found");
        await ValidateStaffLimitAsync(tenantId, tenant.SubscriptionPlan);
        if (!string.IsNullOrEmpty(staffDto.UserId))
        {
            var user = await _context.Users.FindAsync(staffDto.UserId);
            if(user == null)
                throw new NotFoundException("user not found");
            var existingStaff = await _context.Staff.AnyAsync(s => s.UserId == staffDto.UserId && s.TenantId == tenantId);
            if (existingStaff)
                throw new BadRequestException("staff member already exists for this user");
        }
        else if (!string.IsNullOrEmpty(staffDto.Email) && !string.IsNullOrEmpty(staffDto.Password))
        {
            // Auto-create user
            var existingUser = await _userManager.FindByEmailAsync(staffDto.Email);
            if (existingUser != null)
                throw new BadRequestException("A user with this email already exists");

            var newUser = new User
            {
                UserName = staffDto.Email,
                Email = staffDto.Email,
                FirstName = staffDto.FirstName ?? "Staff",
                LastName = staffDto.LastName ?? "",
                TenantId = tenantId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var createResult = await _userManager.CreateAsync(newUser, staffDto.Password);
            if (!createResult.Succeeded)
                throw new BadRequestException($"Failed to create user: {string.Join(", ", createResult.Errors.Select(e => e.Description))}");
            
            var roleAddResult = await _userManager.AddToRoleAsync(newUser, "Staff");
            if (!roleAddResult.Succeeded)
                throw new BadRequestException($"Failed to assign Staff role: {string.Join(", ", roleAddResult.Errors.Select(e => e.Description))}");

            staffDto.UserId = newUser.Id;
        }

        var staff = staffDto.ToEntity(tenantId);
        _context.Staff.Add(staff);
        await _context.SaveChangesAsync();
        
        if(staffDto.ServiceIds.Any())
            await AssignServiceAsync(staff.Id,staffDto.ServiceIds, tenantId);
        return await GetStaffByIdAsync(tenantId, staff.Id);
        
    }

    public async Task<StaffDto> AssignServiceAsync(int staffId, List<int> serviceIds, Guid tenantId)
    {
        var staff = await _context.Staff
            .Include(s => s.ServiceStaff)
            .FirstOrDefaultAsync(s => s.Id == staffId && s.TenantId == tenantId);
        if (staff is null)
            throw new Exception("staff member not found");
        var validateServiceIds = await _context.Services
            .Where(s => serviceIds.Contains(s.Id) && s.TenantId == tenantId)
            .Select(s => s.Id)
            .ToListAsync();
        if (validateServiceIds.Count != serviceIds.Count)
            throw new Exception("one or more services not found or don't belong to tenant");
        if(staff.ServiceStaff!=null)
            _context.ServiceStaff.RemoveRange(staff.ServiceStaff);
        var assignments = validateServiceIds.Select(serviceId => new ServiceStaff
        {
            StaffId = staffId,
            ServiceId = serviceId
        });
        await _context.ServiceStaff.AddRangeAsync(assignments);
        await _context.SaveChangesAsync();
        return await GetStaffByIdAsync(tenantId, staffId);
    }

    public Task<StaffDto> UpdateStaffAsync(int id, UpdateStaffDto staffDto, Guid tenantId)
    {
        throw new NotImplementedException();
    }

  

    public async Task<bool> DeleteStaffAsync(int staffId, Guid tenantId)
    {
        var staff = await _context.Staff.FirstOrDefaultAsync(s=>s.Id==staffId && s.TenantId == tenantId);
        if(staff == null)
            throw new Exception("staff member not found");
        _context.Staff.Remove(staff);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<StaffDto>> GetStaffByServiceIdAsync(int serviceId, Guid tenantId)
    {
        var staff = await _context.Staff
            .Include(s => s.User)
            .Include(s => s.ServiceStaff)!
            .ThenInclude(ss => ss.Service)
            .Where(s => s.TenantId == tenantId && s.ServiceStaff != null &&
                        s.ServiceStaff.Any(ss => ss.ServiceId == serviceId))
            .ToListAsync();
        return staff.TodtoList();
    }

    private async Task ValidateStaffLimitAsync(Guid tenantId, SubscriptionPlan plan)
    {
        var maxStaff = SubscriptionPlanLimits.GetMaxStaff(plan);
        if (!maxStaff.HasValue) return;

        var currentStaffCount = await _context.Staff
            .IgnoreQueryFilters()
            .CountAsync(s => s.TenantId == tenantId && s.IsActive);

        if (currentStaffCount >= maxStaff.Value)
            throw new BadRequestException($"Your {plan} plan allows up to {maxStaff.Value} staff member(s). Upgrade your plan to add more staff.");
    }
}
