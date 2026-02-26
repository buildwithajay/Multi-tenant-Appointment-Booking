using api.Application.DTOs.BookingDto;
using api.src.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace api.API.Controllers;

[ApiController]
[Route("api/public/tenant/{slug}")]
public class PublicBookingController : ControllerBase
{
    private readonly IPublicBookingService _publicBookingService;

    public PublicBookingController(IPublicBookingService publicBookingService)
    {
        _publicBookingService = publicBookingService;
    }

    [HttpGet("catalog")]
    public async Task<IActionResult> GetCatalog([FromRoute] string slug)
    {
        var catalog = await _publicBookingService.GetTenantCatalogAsync(slug);
        return Ok(catalog);
    }

    [HttpGet("availability")]
    public async Task<IActionResult> GetAvailability(
        [FromRoute] string slug,
        [FromQuery] int serviceId,
        [FromQuery] int staffId,
        [FromQuery] string date,
        [FromQuery] int timezoneOffsetMinutes = 0)
    {
        var availability = await _publicBookingService.GetAvailabilityAsync(
            slug,
            serviceId,
            staffId,
            date,
            timezoneOffsetMinutes);
        return Ok(availability);
    }

    [HttpGet("/api/public/availability/{slug}")]
    public async Task<IActionResult> GetAvailabilityFallbackRoute(
        [FromRoute] string slug,
        [FromQuery] int serviceId,
        [FromQuery] int staffId,
        [FromQuery] string date,
        [FromQuery] int timezoneOffsetMinutes = 0)
    {
        var availability = await _publicBookingService.GetAvailabilityAsync(
            slug,
            serviceId,
            staffId,
            date,
            timezoneOffsetMinutes);
        return Ok(availability);
    }

    [HttpPost("bookings")]
    public async Task<IActionResult> CreateBooking([FromRoute] string slug, [FromBody] PublicCreateBookingDto dto)
    {
        var booking = await _publicBookingService.CreatePublicBookingAsync(slug, dto);
        return Ok(booking);
    }
}
