using System.ComponentModel.DataAnnotations;

namespace api.Application.DTOs.BookingDto;

public record PublicCreateBookingDto
{
    [Required]
    [StringLength(100)]
    public string FirstName { get; init; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string LastName { get; init; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(256)]
    public string Email { get; init; } = string.Empty;

    [StringLength(20)]
    public string? Phone { get; init; }

    [Required]
    public int ServiceId { get; init; }

    [Required]
    public int StaffId { get; init; }

    [Required]
    public DateTime StartTime { get; init; }

    public DateTime? EndTime { get; init; }

    [StringLength(1000)]
    public string? Notes { get; init; }
}

public record PublicBookingResponseDto
{
    public int BookingId { get; init; }
    public int CustomerId { get; init; }
    public string TenantName { get; init; } = string.Empty;
    public string ServiceName { get; init; } = string.Empty;
    public string StaffName { get; init; } = string.Empty;
    public DateTime StartTime { get; init; }
    public DateTime EndTime { get; init; }
}
