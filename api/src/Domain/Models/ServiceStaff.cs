using api.src.Domain.Models;

namespace api.Domain.Models;

public class ServiceStaff
{
     
    public int StaffId { get; set; }
    public int ServiceId { get; set; }
    public Service? Service { get; set; }
    public Staff? Staff { get; set; }
}
