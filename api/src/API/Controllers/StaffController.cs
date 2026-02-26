using api.Application.DTOs.StaffDto;
using api.Application.Exceptions;
using api.src.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace api.API.Controllers;
[ApiController]
[Route("api/staff")]
[Authorize]
public class StaffController: ControllerBase
{
    private readonly IStaffService _staffService;

    public StaffController(IStaffService staffService)
    {
        _staffService = staffService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllStaff()
    {
        var tenantId = await GetCurrentTenantId();
        var staff = await _staffService.GetAllAsync(tenantId);
        if (IsStaffOnlyAccess())
        {
            var currentUserId = GetCurrentUserId();
            staff = staff.Where(s => s.UserId == currentUserId).ToList();
        }
        return Ok(staff);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        var tenantId = await GetCurrentTenantId();
        if (IsStaffOnlyAccess())
        {
            var currentUserId = GetCurrentUserId();
            var ownStaff = (await _staffService.GetAllAsync(tenantId))
                .FirstOrDefault(s => s.UserId == currentUserId);
            if (ownStaff == null || ownStaff.Id != id)
                throw new ForbiddenException("You can only view your own staff profile");
        }
        var staff= await _staffService.GetStaffByIdAsync(tenantId, id);
        return Ok(staff);
    }

    [HttpPost]
    [Authorize(Roles = "Admin, Manager")]
    public async Task<IActionResult> CreateStaff([FromBody] CreateStaffDto createStaffDto)
    {
        var tenantId = await GetCurrentTenantId();
        var staff = await _staffService.CreateAsync(createStaffDto, tenantId);
        return CreatedAtAction(nameof(GetById), new { id = staff.Id }, staff);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin, Manager")]
    public async Task<IActionResult> UpdateStaff([FromRoute] int id, [FromBody] UpdateStaffDto updateStaffDto)
    {
        var tenantId = await GetCurrentTenantId();
        var staff = await _staffService.UpdateStaffAsync(id,updateStaffDto, tenantId);
        return Ok(staff);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin, Manager")]
    public async Task<IActionResult> DeleteStaff([FromRoute] int id)
    {
        var tenantId = await GetCurrentTenantId();
        var staff = await _staffService.DeleteStaffAsync(id, tenantId);
        if(!staff)
            throw new NotFoundException("Staff Not Found");
        return NoContent();
    }

    [HttpPut("{id:int}/assign-service")]
    [Authorize(Roles = "Admin, Manager")]
    public async Task<IActionResult> AssignService([FromRoute] int id, [FromBody] AssignServiceDto assignServiceDto)
    {
        var tenantId = await GetCurrentTenantId();
        var staff = await _staffService.AssignServiceAsync(id,assignServiceDto.ServiceIds, tenantId);
        return Ok(staff);
    }
    private Task<Guid> GetCurrentTenantId()
    {
        var tenantIdClaim = User.Claims.FirstOrDefault(c => c.Type == "TenantId");
        return tenantIdClaim == null ? throw new Exception("TenantId claim not found") : Task.FromResult(Guid.Parse(tenantIdClaim.Value));
    }

    private bool IsStaffOnlyAccess()
    {
        var isStaff = User.IsInRole("Staff");
        var isManagerOrAdmin = User.IsInRole("Manager") || User.IsInRole("Admin");
        return isStaff && !isManagerOrAdmin;
    }

    private string GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
            throw new UnauthorizedException("User id claim not found");
        return userId;
    }
}
public record AssignServiceDto(List<int> ServiceIds);
