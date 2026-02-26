using System.ComponentModel.DataAnnotations;
using api.src.Domain.Enums;
using api.src.Domain.Models;

namespace api.Domain.Models;

public class Tenant
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Slug { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Phone]
    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(500)]
    [Url]
    public string? LogoUrl { get; set; }

    [Required]
    public BusinessType BusinessType { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    [MaxLength(100)]
    public string TimeZone { get; set; } = "UTC";

    [Required]
    public SubscriptionPlan SubscriptionPlan { get; set; } = SubscriptionPlan.Starter;

    [MaxLength(200)]
    public string? AddressLine1 { get; set; }

    [MaxLength(200)]
    public string? AddressLine2 { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(100)]
    public string? State { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    [MaxLength(20)]
    public string? PostalCode { get; set; }

    [MaxLength(500)]
    [Url]
    public string? Website { get; set; }

    public string? WorkingHoursJson { get; set; }

    public bool IsActive { get; set; } = true;
    [MaxLength(40)]
    public string PaymentStatus { get; set; } = "NotRequired";
    [MaxLength(255)]
    public string? StripeCheckoutSessionId { get; set; }
    [MaxLength(255)]
    public string? StripeSubscriptionId { get; set; }
    public DateTime? PaymentActivatedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation Properties
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<Staff> Staff { get; set; } = new List<Staff>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<Customer> Customers { get; set; } = new List<Customer>();
}
