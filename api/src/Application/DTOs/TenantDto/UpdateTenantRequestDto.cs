using System.ComponentModel.DataAnnotations;

namespace api.src.Application.DTOs.TenantDto;

public record UpdateTenantRequestDto
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [EmailAddress]
    public string? Email { get; set; }

    [Phone]
    public string? Phone { get; set; }

    [StringLength(1000)]
    public string? Description { get; set; }

    [StringLength(100)]
    public string? TimeZone { get; set; }

    [Url]
    public string? LogoUrl { get; set; }

    public WorkingHoursDto? WorkingHours { get; set; }
    
}
