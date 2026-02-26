using System.ComponentModel.DataAnnotations;

namespace api.Application.DTOs.BookingDto;

public record CreateBookingDto
{
    public int? CustomerId { get; init; }

    [StringLength(100)]
    public string? CustomerName { get; init; }

    [EmailAddress]
    [StringLength(256)]
    public string? CustomerEmail { get; init; }

    public int? ServiceId { get; init; }

    public int? StaffId { get; init; }

    public DateTime? StartTime { get; init; }

    public DateTime? EndTime { get; init; }

    [StringLength(1000)]
    public string? Notes { get; init; }
}
