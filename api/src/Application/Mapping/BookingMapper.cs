using api.Application.DTOs.BookingDto;
using api.Domain.Models;
using api.src.Domain.Models;
using api.src.Domain.Enums;

namespace api.src.Application.Mapping;

public static class BookingMapper
{
    public static BookingDto ToDto(this Booking booking)
    {
        return new BookingDto
        {
            Id = booking.Id,
            TenantId = booking.TenantId,
            CustomerId = booking.CustomerId,
            ServiceId = booking.ServiceId,
            StaffId = booking.StaffId,
            StartTime = booking.StartTime,
            EndTime = booking.EndTime,
            Status = booking.Status,
            PaymentStatus = booking.PaymentStatus,
            Notes = booking.Notes,
            CreatedAt = booking.CreatedAt,
            UpdatedAt = booking.UpdatedAt,
            CustomerName = GetCustomerName(booking.Customer),
            ServiceName = booking.Service?.Name,
            StaffName = booking.Staff?.User == null
                ? null
                : $"{booking.Staff.User.FirstName} {booking.Staff.User.LastName}".Trim()
        };
    }

    public static Booking ToEntity(this CreateBookingDto dto, Guid tenantId, DateTime endTime)
    {
        return new Booking
        {
            TenantId = tenantId,
            CustomerId = dto.CustomerId ?? 0,
            ServiceId = dto.ServiceId ?? 0,
            StaffId = dto.StaffId ?? 0,
            StartTime = dto.StartTime ?? DateTime.UtcNow,
            EndTime = endTime,
            Status = BookingStatus.Pending,
            PaymentStatus = PaymentStatus.Pending,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };
    }

    public static List<BookingDto> ToDtoList(this List<Booking> bookings)
    {
        return bookings.Select(b => b.ToDto()).ToList();
    }

    private static string? GetCustomerName(Customer? customer)
    {
        if (customer == null)
            return null;

        if (customer.User != null)
            return $"{customer.User.FirstName} {customer.User.LastName}".Trim();

        if (!string.IsNullOrWhiteSpace(customer.Notes) && customer.Notes.StartsWith("PublicBooking|"))
        {
            var parts = customer.Notes.Split('|');
            if (parts.Length >= 3)
                return $"{parts[1]} {parts[2]}".Trim();
        }

        if (!string.IsNullOrWhiteSpace(customer.Notes) && customer.Notes.StartsWith("CustomerProfile|"))
        {
            var parts = customer.Notes.Split('|');
            if (parts.Length >= 2)
                return parts[1].Trim();
        }

        return null;
    }
}
