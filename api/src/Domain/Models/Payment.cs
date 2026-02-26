using System;
using api.src.Domain.Enums;

namespace api.src.Domain.Models;

public class Payment
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
    public string? StripePaymentIntentId { get; set; }
    public PaymentStatus Status { get; set; }
    public string? InvoiceUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Navigation
    public Booking? Booking { get; set; }
}
