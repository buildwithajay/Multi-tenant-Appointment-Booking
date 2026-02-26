
using api.Domain.Models;
using api.src.Application.DTOs.ServiceDto;
using api.src.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace api.src.API.Controllers
{
    [ApiController]
    [Route("api/service")]
    public class ServiceController : ControllerBase
    {
        private readonly IServiceManager _serviceManager;
        private readonly UserManager<User> _userManager;
        public ServiceController(IServiceManager serviceManager, UserManager<User> userManager)
        {
            _serviceManager = serviceManager;
            _userManager = userManager;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll()
        {
            var tenantId = await GetCurrentTenantIdAsync();
            var services = await _serviceManager.GetAllServicesAsync(tenantId);
            var serviceDto = services.Select(service => new ServiceDto
            {
                Id = service.Id,
                Name = service.Name!,
                Description= service.Description,
                Price = service.Price,
                DurationMinutes = service.DurationMinutes,
                Category = service.Category,
                IsActive = service.IsActive,
                TenantId= tenantId
            }).ToList();
            return Ok(serviceDto);
        }


        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            var tenantId = await GetCurrentTenantIdAsync();
            var service = await _serviceManager.GetServiceByIdAsync(tenantId, id);
            if (service == null)
            {
                return NotFound();
            }
            return Ok(new ServiceDto
            {
                Id = service.Id,
                Name = service.Name!,
                Description= service.Description,
                Price = service.Price,
                DurationMinutes = service.DurationMinutes,
                Category = service.Category,
                IsActive = service.IsActive,
                TenantId= tenantId
            });
        }

        [HttpPost]
        [Authorize(Roles = "Admin, Manager")]
        public async Task<IActionResult> CreateService([FromBody] CreateServiceDto dto)
        {
            var tenantId = await GetCurrentTenantIdAsync();
            var service = await _serviceManager.CreateServiceAsync(dto, tenantId);
            return Ok(new ServiceDto
            {
                Id = service.Id,
                Name = service.Name!,
                Description= service.Description,
                Price = service.Price,
                DurationMinutes = service.DurationMinutes,
                Category = service.Category,
                IsActive = service.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                TenantId = tenantId
            });
        }
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin, Manager")]
        public async Task<IActionResult> UpdateService([FromRoute] int id, [FromBody] UpdateServiceDto dto)
        {
            var tenantId = await GetCurrentTenantIdAsync();
            var service = await _serviceManager.UpdateServiceAsync(id, dto, tenantId);
            return Ok(new ServiceDto
            {
                Id = service.Id,
                Name = service.Name!,
                Description= service.Description,
                Price = service.Price,
                DurationMinutes = service.DurationMinutes,
                Category = service.Category,
                IsActive = service.IsActive,
                CreatedAt = service.CreatedAt,
                UpdatedAt = DateTime.UtcNow,
                TenantId = tenantId
            });
        }
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin, Manager")]
        public async Task<IActionResult> DeleteService([FromRoute] int id)
        {
            var tenantId = await GetCurrentTenantIdAsync();
            var result = await _serviceManager.DeleteServiceAsync(id, tenantId);
            if (result)
                return NoContent();
            return NotFound();
        }
        private Task<Guid> GetCurrentTenantIdAsync()
        {
            var tenantIdClaim = User.Claims.FirstOrDefault(c => c.Type == "TenantId");
            return tenantIdClaim == null ? throw new Exception("TenantId claim not found") : Task.FromResult(Guid.Parse(tenantIdClaim.Value));
        }
    }
}