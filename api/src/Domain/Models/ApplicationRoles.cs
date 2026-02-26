using Microsoft.AspNetCore.Identity;

namespace api.Domain.Models;

public class ApplicationRoles : IdentityRole
{
    public string? Description { get; set; }
    public DateTime CreateAt { get; set; }
}