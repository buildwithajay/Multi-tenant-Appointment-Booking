using System.ComponentModel.DataAnnotations;
using api.src.Domain.Enums;

namespace api.Application.DTOs.BookingDto;

public record UpdateBookingDto
{
    public int? CustomerId { get; init; }
    public int? ServiceId { get; init; }
    public int? StaffId { get; init; }
    public DateTime? StartTime { get; init; }
    public DateTime? EndTime { get; init; }
    public BookingStatus? Status { get; init; }
    public PaymentStatus? PaymentStatus { get; init; }

    [StringLength(1000)]
    public string? Notes { get; init; }
}
