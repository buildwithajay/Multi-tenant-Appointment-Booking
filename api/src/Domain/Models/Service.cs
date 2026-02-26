using System;
using api.Domain.Models;

namespace api.src.Domain.Models;

public class Service
{
     public int Id { get; set; }
    public Guid TenantId { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public string? Category { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public Tenant? Tenant { get; set; }
    public ICollection<ServiceStaff>? ServiceStaff { get; set; }
    public ICollection<Booking>? Bookings { get; set; }
}
