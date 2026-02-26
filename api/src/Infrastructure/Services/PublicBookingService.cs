using api.Application.DTOs.BookingDto;
using api.Application.Exceptions;
using api.Domain.Models;
using api.Infrastructure.Data;
using api.src.Application.DTOs.NotificationDto;
using api.src.Application.Interfaces;
using api.src.Domain.Enums;
using api.src.Domain.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace api.src.Infrastructure.Services;

public class PublicBookingService : IPublicBookingService
{
    private readonly AppDbContext _context;
    private readonly IBookingNotificationQueue _notificationQueue;
    private readonly ILogger<PublicBookingService> _logger;

    public PublicBookingService(
        AppDbContext context,
        IBookingNotificationQueue notificationQueue,
        ILogger<PublicBookingService> logger)
    {
        _context = context;
        _notificationQueue = notificationQueue;
        _logger = logger;
    }

    public async Task<PublicTenantCatalogDto> GetTenantCatalogAsync(string tenantSlug)
    {
        var tenant = await ResolveTenantBySlugAsync(tenantSlug);
        if (tenant == null)
            throw new NotFoundException("Tenant site not found");

        var services = await _context.Services
            .Where(s => s.TenantId == tenant.Id)
            .OrderBy(s => s.Name)
            .ToListAsync();

        var staff = await _context.Staff
            .Include(s => s.User)
            .Include(s => s.ServiceStaff)
            .Where(s => s.TenantId == tenant.Id)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync();

        return new PublicTenantCatalogDto
        {
            TenantId = tenant.Id,
            TenantName = tenant.Name,
            TenantSlug = tenant.Slug,
            LogoUrl = tenant.LogoUrl,
            Description = tenant.Description,
            Services = services.Select(s => new PublicServiceItemDto
            {
                Id = s.Id,
                Name = s.Name ?? string.Empty,
                Description = s.Description,
                Price = s.Price,
                DurationMinutes = s.DurationMinutes
            }).ToList(),
            Staff = staff.Select(s => new PublicStaffItemDto
            {
                Id = s.Id,
                Name = s.User == null
                    ? $"Staff #{s.Id}"
                    : $"{s.User.FirstName} {s.User.LastName}".Trim(),
                ServiceIds = s.ServiceStaff?.Select(ss => ss.ServiceId).ToList() ?? new List<int>()
            }).ToList()
        };
    }

    public async Task<PublicAvailabilityResponseDto> GetAvailabilityAsync(
        string tenantSlug,
        int serviceId,
        int staffId,
        string date,
        int timezoneOffsetMinutes)
    {
        var tenant = await ResolveTenantBySlugAsync(tenantSlug);
        if (tenant == null)
            throw new NotFoundException("Tenant site not found");

        if (!TryParseLocalDate(date, out var localDate))
            throw new BadRequestException("Invalid date. Use yyyy-MM-dd.");

        var service = await _context.Services
            .FirstOrDefaultAsync(s => s.Id == serviceId && s.TenantId == tenant.Id);
        if (service == null)
            throw new NotFoundException("Service not found");

        var staff = await _context.Staff
            .FirstOrDefaultAsync(s => s.Id == staffId && s.TenantId == tenant.Id);
        if (staff == null)
            throw new NotFoundException("Staff not found");

        var staffCanPerformService = await _context.ServiceStaff
            .AnyAsync(ss => ss.StaffId == staffId && ss.ServiceId == serviceId);
        if (!staffCanPerformService)
            throw new BadRequestException("Selected staff is not assigned to this service");

        var localDayStart = localDate.ToDateTime(TimeOnly.MinValue);
        var localDayEnd = localDayStart.AddDays(1);

        // Client sends getTimezoneOffset(): UTC = local + offset minutes.
        var utcDayStart = DateTime.SpecifyKind(localDayStart.AddMinutes(timezoneOffsetMinutes), DateTimeKind.Utc);
        var utcDayEnd = DateTime.SpecifyKind(localDayEnd.AddMinutes(timezoneOffsetMinutes), DateTimeKind.Utc);

        var bookedSlots = await _context.Bookings
            .Where(b =>
                b.TenantId == tenant.Id &&
                b.StaffId == staffId &&
                b.Status != BookingStatus.Cancelled &&
                b.StartTime < utcDayEnd &&
                utcDayStart < b.EndTime)
            .OrderBy(b => b.StartTime)
            .Select(b => new PublicBookedSlotDto
            {
                BookingId = b.Id,
                StartTime = b.StartTime,
                EndTime = b.EndTime
            })
            .ToListAsync();

        return new PublicAvailabilityResponseDto
        {
            Date = localDate.ToString("yyyy-MM-dd"),
            ServiceId = serviceId,
            StaffId = staffId,
            ServiceDurationMinutes = service.DurationMinutes,
            BookedSlots = bookedSlots
        };
    }

    public async Task<PublicBookingResponseDto> CreatePublicBookingAsync(string tenantSlug, PublicCreateBookingDto dto)
    {
        var tenant = await ResolveTenantBySlugAsync(tenantSlug);
        if (tenant == null)
            throw new NotFoundException("Tenant site not found");
        
        var normalizedEmail = dto.Email.Trim();
        var normalizedFirstName = dto.FirstName.Trim();
        var normalizedLastName = dto.LastName.Trim();

        var service = await _context.Services
            .FirstOrDefaultAsync(s => s.Id == dto.ServiceId && s.TenantId == tenant.Id);
        if (service == null)
            throw new NotFoundException("Service not found");

        var staff = await _context.Staff
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == dto.StaffId && s.TenantId == tenant.Id);
        if (staff == null)
            throw new NotFoundException("Staff not found");

        var staffCanPerformService = await _context.ServiceStaff
            .AnyAsync(ss => ss.StaffId == dto.StaffId && ss.ServiceId == dto.ServiceId);
        if (!staffCanPerformService)
            throw new BadRequestException("Selected staff is not assigned to this service");

        var endTime = dto.EndTime ?? dto.StartTime.AddMinutes(service.DurationMinutes);
        if (endTime <= dto.StartTime)
            throw new BadRequestException("End time must be greater than start time");

        await ValidateBookingPlanLimitAsync(tenant, dto.StartTime);
        var hasConflict = await _context.Bookings.AnyAsync(b =>
            b.StaffId == dto.StaffId &&
            b.Status != BookingStatus.Cancelled &&
            b.StartTime < endTime &&
            dto.StartTime < b.EndTime);
        if (hasConflict)
            throw new BadRequestException("Selected slot is not available");

        var customer = new Customer
        {
            TenantId = tenant.Id,
            UserId = null,
            Notes = $"PublicBooking|{normalizedFirstName}|{normalizedLastName}|{normalizedEmail}|{dto.Phone}|{dto.Notes}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        var booking = new Booking
        {
            TenantId = tenant.Id,
            CustomerId = customer.Id,
            ServiceId = dto.ServiceId,
            StaffId = dto.StaffId,
            StartTime = dto.StartTime,
            EndTime = endTime,
            Status = BookingStatus.Pending,
            PaymentStatus = PaymentStatus.Pending,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        try
        {
            await _notificationQueue.QueueBookingConfirmationAsync(new BookingConfirmationEmailJob
            {
                ToEmail = normalizedEmail,
                ToName = $"{normalizedFirstName} {normalizedLastName}".Trim(),
                TenantName = tenant.Name,
                ServiceName = service.Name ?? string.Empty,
                StaffName = staff.User == null ? $"Staff #{staff.Id}" : $"{staff.User.FirstName} {staff.User.LastName}".Trim(),
                StartTime = booking.StartTime,
                EndTime = booking.EndTime,
                Notes = booking.Notes
            });
            _logger.LogInformation("Queued booking confirmation email for {Email}, booking {BookingId}", normalizedEmail, booking.Id);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enqueue public booking confirmation email for booking {BookingId}", booking.Id);
        }

        var staffName = staff.User == null ? $"Staff #{staff.Id}" : $"{staff.User.FirstName} {staff.User.LastName}".Trim();
        return new PublicBookingResponseDto
        {
            BookingId = booking.Id,
            CustomerId = customer.Id,
            TenantName = tenant.Name,
            ServiceName = service.Name ?? string.Empty,
            StaffName = staffName,
            StartTime = booking.StartTime,
            EndTime = booking.EndTime
        };
    }

    private async Task<Tenant?> ResolveTenantBySlugAsync(string tenantSlug)
    {
        var normalizedInput = NormalizeSlug(tenantSlug);
        if (string.IsNullOrWhiteSpace(normalizedInput))
            return null;

        var exact = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Slug.ToLower() == normalizedInput);
        if (exact != null)
            return exact;

        var tenants = await _context.Tenants
            .Select(t => new { Tenant = t, t.Slug })
            .ToListAsync();

        var normalizedMatches = tenants
            .Where(x =>
                NormalizeSlug(x.Slug) == normalizedInput ||
                NormalizeSlug(x.Tenant.Name) == normalizedInput)
            .Select(x => x.Tenant)
            .ToList();
        if (normalizedMatches.Count > 0)
            return PickBestTenantMatch(normalizedInput, normalizedMatches);

        var startsWithMatches = tenants
            .Where(x =>
            {
                var s = NormalizeSlug(x.Slug);
                var name = NormalizeSlug(x.Tenant.Name);
                return s.StartsWith(normalizedInput) || normalizedInput.StartsWith(s) ||
                       name.StartsWith(normalizedInput) || normalizedInput.StartsWith(name);
            })
            .Select(x => x.Tenant)
            .ToList();

        return startsWithMatches.Count > 0 ? PickBestTenantMatch(normalizedInput, startsWithMatches) : null;
    }

    private static string NormalizeSlug(string value)
    {
        var slug = value.Trim().ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        return slug.Trim('-');
    }

    private static Tenant PickBestTenantMatch(string normalizedInput, List<Tenant> candidates)
    {
        return candidates
            .OrderBy(t => ComputeMatchScore(normalizedInput, NormalizeSlug(t.Slug), NormalizeSlug(t.Name)))
            .ThenBy(t => t.CreatedAt)
            .First();
    }

    private static int ComputeMatchScore(string input, string slug, string name)
    {
        var slugDistance = Math.Abs(slug.Length - input.Length);
        var nameDistance = Math.Abs(name.Length - input.Length);

        var prefixPenalty = 0;
        if (!slug.StartsWith(input) && !input.StartsWith(slug))
            prefixPenalty += 3;
        if (!name.StartsWith(input) && !input.StartsWith(name))
            prefixPenalty += 3;

        return Math.Min(slugDistance, nameDistance) + prefixPenalty;
    }

    private async Task ValidateBookingPlanLimitAsync(Tenant tenant, DateTime bookingStartTime)
    {
        var monthlyLimit = SubscriptionPlanLimits.GetMonthlyBookingLimit(tenant.SubscriptionPlan);
        if (!monthlyLimit.HasValue) return;

        var monthStart = new DateTime(bookingStartTime.Year, bookingStartTime.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextMonthStart = monthStart.AddMonths(1);

        var currentMonthBookingCount = await _context.Bookings
            .Where(b =>
                b.TenantId == tenant.Id &&
                b.StartTime >= monthStart &&
                b.StartTime < nextMonthStart)
            .CountAsync();

        if (currentMonthBookingCount >= monthlyLimit.Value)
            throw new BadRequestException($"This business is on the {tenant.SubscriptionPlan} plan and reached the monthly booking limit of {monthlyLimit.Value}.");
    }

    private static bool TryParseLocalDate(string rawDate, out DateOnly localDate)
    {
        return DateOnly.TryParseExact(rawDate, "yyyy-MM-dd", out localDate) ||
               DateOnly.TryParseExact(rawDate, "dd/MM/yyyy", out localDate) ||
               DateOnly.TryParse(rawDate, out localDate);
    }
}
