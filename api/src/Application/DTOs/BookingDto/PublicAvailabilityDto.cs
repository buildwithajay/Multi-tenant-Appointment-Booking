namespace api.Application.DTOs.BookingDto;

public record PublicAvailabilityResponseDto
{
    public string Date { get; init; } = string.Empty;
    public int ServiceId { get; init; }
    public int StaffId { get; init; }
    public int ServiceDurationMinutes { get; init; }
    public List<PublicBookedSlotDto> BookedSlots { get; init; } = new();
}

public record PublicBookedSlotDto
{
    public int BookingId { get; init; }
    public DateTime StartTime { get; init; }
    public DateTime EndTime { get; init; }
}
