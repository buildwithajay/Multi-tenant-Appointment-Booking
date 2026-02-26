using api.src.Domain.Models;

namespace api.Domain.Models;

public class Customer
{
    public int Id { get; set; }
    public string? UserId { get; set; }
    public User? User { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdateAt { get; set; }
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }
    public ICollection<Booking>? Bookings {get; set;}
}
