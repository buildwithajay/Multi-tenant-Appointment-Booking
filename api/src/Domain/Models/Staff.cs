using System;
using api.Domain.Models;
using api.src.Application.DTOs.TenantDto;

namespace api.src.Domain.Models;

public class Staff
{
    public int Id { get; set; }
    public Guid TenantId { get; set; }
    public string? UserId { get; set; }
    public string? Specialization { get; set; }
    public string? WorkingHoursJson { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    

    public Tenant? Tenant { get; set; }
    public User? User { get; set; }
    public ICollection<ServiceStaff>? ServiceStaff { get; set; }
    public ICollection<Booking>? Bookings { get; set; }
}
