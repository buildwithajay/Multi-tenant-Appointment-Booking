using api.Application.DTOs.StaffDto;

namespace api.src.Application.Interfaces;

public interface IStaffService
{
    Task<List<StaffDto>> GetAllAsync(Guid tenantId);
    Task<StaffDto> GetStaffByIdAsync(Guid tenantId, int id);
    Task<StaffDto> CreateAsync(CreateStaffDto staffDto, Guid tenantId);
    Task<StaffDto> AssignServiceAsync(int staffId, List<int> serviceIds, Guid tenantId);
    Task<StaffDto> UpdateStaffAsync(int id, UpdateStaffDto staffDto, Guid tenantId);
    Task<bool> DeleteStaffAsync(int staffId, Guid tenantId);
    Task<List<StaffDto>> GetStaffByServiceIdAsync(int serviceId, Guid tenantId);
}
