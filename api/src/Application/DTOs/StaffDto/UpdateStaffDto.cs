using System.ComponentModel.DataAnnotations;

namespace api.Application.DTOs.StaffDto;

public record UpdateStaffDto
{
    [StringLength(200)] public string? Specialization { get; set; }
    public List<int> ServiceIds { get; set; } = new List<int>();
    public string? WorkingHoursJson { get; set; }
    public bool IsActive { get; set; }
};