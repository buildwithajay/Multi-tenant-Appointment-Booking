using System.ComponentModel.DataAnnotations;

namespace api.src.Application.DTOs.ServiceDto;

public record  UpdateServiceDto
{
    [Required(ErrorMessage = "Service name is required")]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; init; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; init; }

    [Required(ErrorMessage = "Price is required")]
    [Range(0, 99999)]
    public decimal Price { get; init; }

    [Required(ErrorMessage = "Duration is required")]
    [Range(5, 480)]
    public int DurationMinutes { get; init; }

    [StringLength(100)]
    public string? Category { get; init; }

    public bool IsActive { get; init; } = true;
}
