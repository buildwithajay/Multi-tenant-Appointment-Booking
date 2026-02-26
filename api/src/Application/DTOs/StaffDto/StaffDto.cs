namespace api.Application.DTOs.StaffDto;

public record StaffDto
{
    public int Id { get; set; }
    public Guid TenantId { get; set; }
    public string? UserId { get; set; }
    public string? Specialization { get; set; }
    public string? WorkingHoursJson { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreateAt { get; set; }
    public UserInfoDto? User { get; set; }
    public List<StaffServiceDto> Services { get; set; } = new();

};