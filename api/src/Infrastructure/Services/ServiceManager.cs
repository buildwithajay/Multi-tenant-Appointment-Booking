using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using api.Domain.Models;
using api.Infrastructure.Data;
using api.src.Application.DTOs.ServiceDto;
using api.src.Application.Interfaces;
using api.src.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace api.src.Infrastructure.Services
{
    public class ServiceManager : IServiceManager
    {

        private readonly AppDbContext _context;
        public ServiceManager(AppDbContext context)
        {
            _context = context;
        }
        public async Task<Service> CreateServiceAsync(CreateServiceDto createServiceDto, Guid tenantId)
        {
            var tenant = await _context.Tenants.FindAsync(tenantId);
            if (tenant == null)
                throw new Exception("tenant not found");
            var exist = await _context.Services.AnyAsync(s => s.Name!.ToLower() == createServiceDto.Name.ToLower() && tenantId == tenant.Id);
            if (exist)
            {
                throw new Exception($"Service '{createServiceDto.Name}' already exist");
            }
            var service = new Service
            {
                Name = createServiceDto.Name,
                Description = createServiceDto.Description,
                Price = createServiceDto.Price,
                DurationMinutes = createServiceDto.DurationMinutes,
                Category = createServiceDto.Category,
                TenantId = tenantId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            await _context.Services.AddAsync(service);
            await _context.SaveChangesAsync();
            return service;

        }

        public async Task<bool> DeleteServiceAsync(int serviceId, Guid tenantId)
        {
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId && s.TenantId == tenantId);
            if (service == null)
            {
                throw new Exception("service not found");
            }
            _context.Services.Remove(service);
            await _context.SaveChangesAsync();
            return true;
        }

        public Task<List<Service>> GetAllServicesAsync(Guid tenantID)
        {
            var services = _context.Services
                            .Where(s => s.TenantId == tenantID)
                            .OrderBy(s=>s.Category)
                            .ThenBy(s=>s.Name)
                            .ToListAsync();
            return services;
        }

        public async Task<Service?> GetServiceByIdAsync(Guid tenantID, int serviceID)
        {
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceID && s.TenantId == tenantID);
            if (service == null)
            {
                throw new Exception("service not found");
            }
            return service;
        }

        public async Task<Service> UpdateServiceAsync(int serviceId, UpdateServiceDto updateServiceDto, Guid tenantId)
        {
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId && s.TenantId == tenantId);
            if (service == null)
            {
                throw new Exception("service not found");
            }
            service.Name = updateServiceDto.Name?? service.Name;
            service.Description = updateServiceDto.Description?? service.Description;
            service.Price = updateServiceDto.Price!= 0 ? updateServiceDto.Price : service.Price;
            service.DurationMinutes = updateServiceDto.DurationMinutes;
            service.Category = updateServiceDto.Category?? service.Category;
            service.IsActive = updateServiceDto.IsActive;
            service.CreatedAt = service.CreatedAt;
            _context.Services.Update(service);
            _context.SaveChanges();
            return service;        }
    }
    }
