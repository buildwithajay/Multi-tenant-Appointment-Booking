namespace api.src.Application.DTOs.NotificationDto;

public record BookingConfirmationEmailJob
{
    public int Attempt { get; init; }
    public string ToEmail { get; init; } = string.Empty;
    public string ToName { get; init; } = string.Empty;
    public string TenantName { get; init; } = string.Empty;
    public string ServiceName { get; init; } = string.Empty;
    public string StaffName { get; init; } = string.Empty;
    public DateTime StartTime { get; init; }
    public DateTime EndTime { get; init; }
    public string? Notes { get; init; }
}
