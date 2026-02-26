using api.src.Domain.Enums;

namespace api.Application.DTOs.BookingDto;

public record BookingDto
{
    public int Id { get; init; }
    public Guid TenantId { get; init; }
    public int CustomerId { get; init; }
    public int ServiceId { get; init; }
    public int StaffId { get; init; }
    public DateTime StartTime { get; init; }
    public DateTime EndTime { get; init; }
    public BookingStatus Status { get; init; }
    public PaymentStatus PaymentStatus { get; init; }
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }

    public string? CustomerName { get; init; }
    public string? ServiceName { get; init; }
    public string? StaffName { get; init; }
}
