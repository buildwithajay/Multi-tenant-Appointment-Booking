using System;
using api.Domain.Models;
using api.src.Domain.Enums;

namespace api.src.Domain.Models;

public class Booking
{
     public int Id { get; set; }
    public Guid TenantId { get; set; }
    public int CustomerId { get; set; }
    public int ServiceId { get; set; }
    public int StaffId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public BookingStatus Status { get; set; }
    public PaymentStatus PaymentStatus { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation
    public Tenant? Tenant { get; set; }
    public Customer? Customer { get; set; }
    public Service? Service { get; set; }
    public Staff? Staff { get; set; }
    public Payment? Payment { get; set; }
}
