using api.Domain.Models;
using api.src.Domain.Enums;
using api.src.Domain.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace api.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<User, ApplicationRoles, string>
{
    public AppDbContext(DbContextOptions<AppDbContext> dbContextOptions): base(dbContextOptions){}

    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<Service> Services { get; set; }
    public DbSet<Staff> Staff { get; set; }
    public DbSet<ServiceStaff> ServiceStaff { get; set; }
    public DbSet<Booking> Bookings { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<Payment> Payments { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        builder.Entity<Tenant>().HasQueryFilter(t => t.IsActive);
        builder.Entity<Service>().HasQueryFilter(s => s.IsActive);
        builder.Entity<Staff>().HasQueryFilter(st => st.IsActive);


        

      builder.Entity<ApplicationRoles>().HasData(
        new ApplicationRoles
        {
            Id = "1",
            Name = "Admin",
            NormalizedName = "ADMIN",
            ConcurrencyStamp = "static-admin-stamp",
            Description = "System Administrator with full access",
            CreateAt = DateTime.SpecifyKind(new DateTime(2024, 1, 1), DateTimeKind.Utc)
        },
        new ApplicationRoles
        {
            Id = "2",
            Name = "Manager",
            NormalizedName = "MANAGER",
            ConcurrencyStamp = "static-manager-stamp",
            Description = "Business Manager with elevated permissions",
            CreateAt = DateTime.SpecifyKind(new DateTime(2024, 1, 1), DateTimeKind.Utc)
        },
        new ApplicationRoles
        {
            Id = "3",
            Name = "Staff",
            NormalizedName = "STAFF",
            ConcurrencyStamp = "static-staff-stamp",
            Description = "Staff member with limited access",
            CreateAt = DateTime.SpecifyKind(new DateTime(2024, 1, 1), DateTimeKind.Utc)
        },
        new ApplicationRoles
        {
            Id = "4",
            Name = "ViewOnly",
            NormalizedName = "VIEWONLY",
            ConcurrencyStamp = "static-viewonly-stamp",
            Description = "Read-only access to the system",
            CreateAt = DateTime.SpecifyKind(new DateTime(2024, 1, 1), DateTimeKind.Utc)
        });
            // Make Tenant navigation optional for Booking, Service, and Staff
            builder.Entity<User>()
                .HasOne(u => u.StaffProfile)
                .WithOne(s => s.User)
                .HasForeignKey<Staff>(s => s.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<ServiceStaff>()
            .HasKey(ss => new { ss.ServiceId, ss.StaffId }); 

            builder.Entity<User>()
                .HasOne(u=>u.Tenant)
                .WithMany(t => t.Users)
                .HasForeignKey(u => u.TenantId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Booking>()
                .HasOne(b => b.Tenant)
                .WithMany(t => t.Bookings)
                .HasForeignKey(b => b.TenantId)
                .IsRequired(true);

            builder.Entity<Service>()
                .HasOne(s => s.Tenant)
                .WithMany(t => t.Services)
                .HasForeignKey(s => s.TenantId)
                .IsRequired(true)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Staff>()
                .HasOne(st => st.Tenant)
                .WithMany(t => t.Staff)
                .HasForeignKey(st => st.TenantId)
                .IsRequired(true)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ServiceStaff>()
                .HasOne(ss => ss.Service)
                .WithMany(s => s.ServiceStaff)
                .HasForeignKey(ss => ss.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ServiceStaff>()
                .HasOne(ss => ss.Staff)
                .WithMany(s => s.ServiceStaff)
                .HasForeignKey(ss => ss.StaffId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Customer>()
                .HasOne(c => c.Tenant)
                .WithMany(t => t.Customers)
                .HasForeignKey(c => c.TenantId)
                .IsRequired(true)
                .OnDelete(DeleteBehavior.Cascade);
            
            builder.Entity<Customer>()
                .HasOne(c=>c.User)
                .WithOne()
                .HasForeignKey<Customer>(c=>c.UserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Customer>()
                .HasQueryFilter(c => c.IsActive);

            builder.Entity<Booking>()
            .HasOne(b => b.Customer)
            .WithMany(c => c.Bookings)
            .HasForeignKey(b => b.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Booking>()
            .HasOne(b => b.Service)
            .WithMany(s => s.Bookings)
            .HasForeignKey(b => b.ServiceId)
            .OnDelete(DeleteBehavior.Restrict); 



            builder.Entity<Booking>()
            .HasOne(b => b.Staff)
            .WithMany(s => s.Bookings)
            .HasForeignKey(b => b.StaffId)
            .OnDelete(DeleteBehavior.Cascade); 

            builder.Entity<Payment>()
            .HasOne(p => p.Booking)
            .WithOne(b => b.Payment)
            .HasForeignKey<Payment>(p => p.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

    }
   
   
    
}


