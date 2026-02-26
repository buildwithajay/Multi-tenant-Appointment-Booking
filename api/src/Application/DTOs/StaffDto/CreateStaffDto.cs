using System.ComponentModel.DataAnnotations;
using api.src.Domain.Models;

namespace api.Application.DTOs.StaffDto;

public record CreateStaffDto
{
    [StringLength(200)]
    public string? Specialization { get; set; }

    public List<int> ServiceIds { get; set; } = new();
    public string? UserId { get; set; }
    public string? WorkingHoursJson { get; set; }

    [StringLength(100)]
    public string? FirstName { get; set; }
    [StringLength(100)]
    public string? LastName { get; set; }
    [EmailAddress]
    public string? Email { get; set; }
    public string? Password { get; set; }
}