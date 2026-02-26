using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using api.src.Application.DTOs.ServiceDto;
using api.src.Domain.Models;

namespace api.src.Application.Interfaces
{
    public interface IServiceManager
    {
        Task<Service> CreateServiceAsync(CreateServiceDto createServiceDto, Guid tenantId);
        Task<Service?> GetServiceByIdAsync(Guid tenantID, int serviceID);
        Task<List<Service>> GetAllServicesAsync(Guid tenantID);
        Task<Service> UpdateServiceAsync(int serviceId, UpdateServiceDto updateServiceDto, Guid tenantId);
        Task<bool> DeleteServiceAsync(int serviceId, Guid tenantId);
    }
}