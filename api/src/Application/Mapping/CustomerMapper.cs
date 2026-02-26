using api.Application.DTOs.CustomerDto;
using api.Domain.Models;

namespace api.src.Application.Mapping;

public static class CustomerMapper
{
    private const string ProfilePrefix = "CustomerProfile|";
    private const string PublicBookingPrefix = "PublicBooking|";

    public static CustomerDto ToDto(this Customer customer)
    {
        var profile = ParseCustomerProfile(customer.Notes);
        var publicProfile = ParsePublicBookingProfile(customer.Notes);

        return new CustomerDto
        {
            Id = customer.Id,
            TenantId = customer.TenantId,
            UserId = customer.UserId,
            Notes = profile?.Notes ?? publicProfile?.Notes ?? customer.Notes,
            IsActive = customer.IsActive,
            CreatedAt = customer.CreatedAt,
            UpdatedAt = customer.UpdateAt,
            User = profile != null
                    ? BuildCustomerUserDtoFromNameAndEmail(profile.Value.Name, profile.Value.Email)
                    : publicProfile != null
                        ? BuildCustomerUserDtoFromNameAndEmail(publicProfile.Value.Name, publicProfile.Value.Email)
                        : customer.User != null
                            ? new CustomerUserDto
                            {
                                Id = customer.User.Id,
                                Email = customer.User.Email ?? string.Empty,
                                FirstName = customer.User.FirstName ?? string.Empty,
                                LastName = customer.User.LastName ?? string.Empty,
                                FullName = $"{customer.User.FirstName} {customer.User.LastName}".Trim(),
                                Phone = customer.User.PhoneNumber
                            }
                            : null,
            TotalBookings = customer.Bookings?.Count ?? 0,
            LastBookingDate = customer.Bookings?
                .OrderByDescending(b => b.StartTime)
                .Select(b => (DateTime?)b.StartTime)
                .FirstOrDefault()
        };
    }

    public static Customer ToEntity(this CreateCustomerDto dto, Guid tenantId)
    {
        return new Customer
        {
            TenantId = tenantId,
            UserId = null,
            Notes = dto.Notes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    public static void UpdateEntity(this UpdateCustomerDto dto, Customer customer)
    {
        var profile = ParseCustomerProfile(customer.Notes);
        if (profile != null)
            customer.Notes = BuildCustomerProfileNotes(profile.Value.Name, profile.Value.Email, dto.Notes);
        else
            customer.Notes = dto.Notes;

        customer.IsActive = dto.IsActive;
        customer.UpdateAt = DateTime.UtcNow;
    }

    public static List<CustomerDto> ToDtoList(this List<Customer> customers)
    {
        return customers.Select(c => c.ToDto()).ToList();
    }

    public static string BuildCustomerProfileNotes(string name, string email, string? notes)
    {
        return $"{ProfilePrefix}{name.Trim()}|{email.Trim()}|{(notes ?? string.Empty)}";
    }

    private static CustomerUserDto BuildCustomerUserDtoFromNameAndEmail(string name, string email)
    {
        var (firstName, lastName) = SplitName(name);
        return new CustomerUserDto
        {
            Id = string.Empty,
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            FullName = name.Trim(),
            Phone = null
        };
    }

    private static (string Name, string Email, string? Notes)? ParseCustomerProfile(string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes) || !notes.StartsWith(ProfilePrefix))
            return null;

        var parts = notes.Split('|');
        if (parts.Length < 4)
            return null;

        return (parts[1], parts[2], string.Join("|", parts.Skip(3)));
    }

    private static (string Name, string Email, string? Notes)? ParsePublicBookingProfile(string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes) || !notes.StartsWith(PublicBookingPrefix))
            return null;

        var parts = notes.Split('|');
        if (parts.Length < 6)
            return null;

        return ($"{parts[1]} {parts[2]}".Trim(), parts[3], string.Join("|", parts.Skip(5)));
    }

    private static (string firstName, string lastName) SplitName(string fullName)
    {
        var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0)
            return ("Customer", string.Empty);
        if (parts.Length == 1)
            return (parts[0], string.Empty);
        return (parts[0], string.Join(" ", parts.Skip(1)));
    }
}
