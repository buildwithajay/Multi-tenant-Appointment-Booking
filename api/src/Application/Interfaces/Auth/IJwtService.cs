using api.Domain.Models;
using api.src.Domain.Models;

namespace api.Application.Interfaces.Auth;

public interface IJwtService
{
    string GenerateToken(User user, IList<string> roles);
    string GenerateRefreshToken();
    
}