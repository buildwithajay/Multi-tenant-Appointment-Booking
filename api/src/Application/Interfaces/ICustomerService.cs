using api.Application.DTOs.CustomerDto;

namespace api.src.Application.Interfaces;

public interface ICustomerService
{
    Task<List<CustomerDto>> GetAllCustomersAsync(Guid tenantId, string? currentUserId = null, bool staffOnly = false);
    Task<CustomerDto> GetCustomerByIdAsync(int id, Guid tenantId, string? currentUserId = null, bool staffOnly = false);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerDto createCustomerDto, Guid tenantId);
    Task<CustomerDto> UpdateCustomerAsync(int id, UpdateCustomerDto updateCustomerDto, Guid tenantId);
    Task<bool> DeleteCustomerAsync(int id, Guid tenantId);
}
