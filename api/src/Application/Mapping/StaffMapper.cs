using api.Application.DTOs.StaffDto;
using api.src.Domain.Models;

namespace api.Application.Mapping;

public static class StaffMapper
{
    public static StaffDto ToDto(this Staff staff)
    {
        return new StaffDto
        {
            Id = staff.Id,
            TenantId = staff.TenantId,
            UserId = staff.UserId,
            Specialization = staff.Specialization,
            WorkingHoursJson = staff.WorkingHoursJson,
            IsActive = staff.IsActive,
            CreateAt = staff.CreatedAt,
            User = staff.User != null ? new UserInfoDto
            {
                Id = staff.User.Id,
                Email = staff.User.Email ?? string.Empty,
                FirstName = staff.User.FirstName!,
                LastName = staff.User.LastName!,
                FullName = $"{staff.User.FirstName} {staff.User.LastName}",
            } : null,
            Services = staff.ServiceStaff?
                .Where(ss => ss.Service != null)
                .Select(ss => new StaffServiceDto
                {
                    Id = ss.Service!.Id,
                    Name = ss.Service.Name!,
                    Price = ss.Service.Price,
                    DurationMinutes = ss.Service.DurationMinutes
                }).ToList() ?? new List<StaffServiceDto>()
        };
    }

    public static Staff ToEntity(this CreateStaffDto staffDto, Guid tenantId)
    {
        return new Staff
        {
           
            TenantId = tenantId,
            UserId = staffDto.UserId,
            Specialization = staffDto.Specialization,
            WorkingHoursJson = staffDto.WorkingHoursJson,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    public static void UpdateEntity(this UpdateStaffDto dto, Staff staff)
    {
        staff.Specialization= dto.Specialization;
        staff.WorkingHoursJson = dto.WorkingHoursJson;
        staff.IsActive = dto.IsActive;
    }

    public static List<StaffDto> TodtoList(this List<Staff> staffs)
    {
        return staffs.Select(s => s.ToDto()).ToList();
    }

}