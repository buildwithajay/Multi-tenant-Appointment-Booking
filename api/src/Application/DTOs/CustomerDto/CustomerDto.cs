namespace api.Application.DTOs.CustomerDto;

public record CustomerDto
{
    public int Id { get; init; }
    public Guid TenantId { get; init; }
    public string? UserId { get; init; }
    public string? Notes { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    
    // User info (if linked)
    public CustomerUserDto? User { get; init; }
    
    // Booking statistics
    public int TotalBookings { get; init; }
    public DateTime? LastBookingDate { get; init; }
};