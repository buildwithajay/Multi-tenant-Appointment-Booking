using api.Application.DTOs.BookingDto;
using api.Application.Exceptions;
using api.Domain.Models;
using api.src.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace api.API.Controllers;

[ApiController]
[Route("api/booking")]
[Authorize]
public class BookingController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly UserManager<User> _userManager;

    public BookingController(IBookingService bookingService, UserManager<User> userManager)
    {
        _bookingService = bookingService;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllBookings()
    {
        var tenantId = await GetCurrentTenantIdAsync();
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var staffOnly = IsStaffOnlyAccess();
        var bookings = await _bookingService.GetAllBookingsAsync(tenantId, currentUserId, staffOnly);
        return Ok(bookings);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetBookingById([FromRoute] int id)
    {
        var tenantId = await GetCurrentTenantIdAsync();
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var staffOnly = IsStaffOnlyAccess();
        var booking = await _bookingService.GetBookingByIdAsync(id, tenantId, currentUserId, staffOnly);
        return Ok(booking);
    }

    [HttpPost]
    [Authorize(Roles = "Admin, Manager")]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingDto createBookingDto)
    {
        var tenantId = await GetCurrentTenantIdAsync();
        var booking = await _bookingService.CreateBookingAsync(createBookingDto, tenantId);
        return CreatedAtAction(nameof(GetBookingById), new { id = booking.Id }, booking);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin, Manager")]
    public async Task<IActionResult> UpdateBooking([FromRoute] int id, [FromBody] UpdateBookingDto updateBookingDto)
    {
        var tenantId = await GetCurrentTenantIdAsync();
        var booking = await _bookingService.UpdateBookingAsync(id, updateBookingDto, tenantId);
        return Ok(booking);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin, Manager")]
    public async Task<IActionResult> DeleteBooking([FromRoute] int id)
    {
        var tenantId = await GetCurrentTenantIdAsync();
        var deleted = await _bookingService.DeleteBookingAsync(id, tenantId);
        if (!deleted)
            throw new NotFoundException("Booking not found");

        return NoContent();
    }

    private async Task<Guid> GetCurrentTenantIdAsync()
    {
        var tenantIdClaim = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;
        if (!string.IsNullOrWhiteSpace(tenantIdClaim) && Guid.TryParse(tenantIdClaim, out var tenantId))
            return tenantId;

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            throw new UnauthorizedException("Valid TenantId claim is required");

        var user = await _userManager.FindByIdAsync(userId);
        if (user?.TenantId is Guid dbTenantId)
            return dbTenantId;

        throw new UnauthorizedException("Valid TenantId claim is required");
    }

    private bool IsStaffOnlyAccess()
    {
        var isStaff = User.IsInRole("Staff");
        var isManagerOrAdmin = User.IsInRole("Manager") || User.IsInRole("Admin");
        return isStaff && !isManagerOrAdmin;
    }
}
