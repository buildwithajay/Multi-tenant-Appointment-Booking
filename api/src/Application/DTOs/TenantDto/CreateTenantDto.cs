using System.ComponentModel.DataAnnotations;
using api.src.Application.DTOs.TenantDto;
using api.src.Domain.Enums;

namespace api.src.Application.DTOs;

public record  CreateTenantDto
{
    [Required(ErrorMessage = "Business name is required")]
    [StringLength(200, MinimumLength =2, ErrorMessage = "Business name must be from2 to 200 characters")]
    public string? Name { get; set; }
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    public string Email { get; set; } = string.Empty;

    [Phone(ErrorMessage = "Invalid phone number")]
    public string? Phone { get; set; }

    [Required(ErrorMessage = "Business type is required")]
    public BusinessType BusinessType { get; set; }

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string? Description { get; set; }


    // Address information
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
    public string? Website { get; set; }

    // Subscription plan (defaults to Starter)
    public SubscriptionPlan SubscriptionPlan { get; set; } = SubscriptionPlan.Starter;

    // Working hours (JSON string or separate DTO)

    // Admin user information (for tenant creation)
    [Required(ErrorMessage = "Admin first name is required")]
    public string AdminFirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Admin last name is required")]
    public string AdminLastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Admin email is required")]
    [EmailAddress(ErrorMessage = "Invalid admin email format")]
    public string AdminEmail { get; set; } = string.Empty;

    [Required(ErrorMessage = "Admin password is required")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters")]

    public string AdminPassword { get; set; } = string.Empty;
}

