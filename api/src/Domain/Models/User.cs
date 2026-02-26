using api.src.Domain.Models;
using Microsoft.AspNetCore.Identity;

namespace api.Domain.Models;

public class User : IdentityUser
{
    public string? FirstName { get; set; } 
    public string? LastName { get; set; }
    public Guid? TenantId { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public Tenant? Tenant {get;set;}
    public Staff? StaffProfile {get;set;}
}
