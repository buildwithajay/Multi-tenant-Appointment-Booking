using api.Application.DTOs.CustomerDto;
using api.Application.Exceptions;
using api.Domain.Models;
using api.src.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace api.API.Controllers;

[ApiController]
[Route("api/customer")]
[Authorize]
public class CustomerController : ControllerBase
{
    private readonly ICustomerService _customerService;
    private readonly UserManager<User> _userManager;

    public CustomerController(ICustomerService customerService, UserManager<User> userManager)
    {
        _customerService = customerService;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllCustomers()
    {
        var tenantId = await GetCurrentTenantIdAsync();
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var staffOnly = IsStaffOnlyAccess();
        var customers = await _customerService.GetAllCustomersAsync(tenantId, currentUserId, staffOnly);
        return Ok(customers);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetCustomerById([FromRoute] int id)
    {
        var tenantId = await GetCurrentTenantIdAsync();
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var staffOnly = IsStaffOnlyAccess();
        var customer = await _customerService.GetCustomerByIdAsync(id, tenantId, currentUserId, staffOnly);
        return Ok(customer);
    }

    [HttpPost]
    [Authorize(Roles = "Admin, Manager")]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerDto createCustomerDto)
    {
        var tenantId = await GetCurrentTenantIdAsync();
        var customer = await _customerService.CreateCustomerAsync(createCustomerDto, tenantId);
        return CreatedAtAction(nameof(GetCustomerById), new { id = customer.Id }, customer);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin, Manager")]
    public async Task<IActionResult> UpdateCustomer([FromRoute] int id, [FromBody] UpdateCustomerDto updateCustomerDto)
    {
        var tenantId = await GetCurrentTenantIdAsync();
        var customer = await _customerService.UpdateCustomerAsync(id, updateCustomerDto, tenantId);
        return Ok(customer);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin, Manager")]
    public async Task<IActionResult> DeleteCustomer([FromRoute] int id)
    {
        var tenantId = await GetCurrentTenantIdAsync();
        var customer = await _customerService.DeleteCustomerAsync(id, tenantId);
        if (!customer)
            throw new NotFoundException("Customer not found");

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
