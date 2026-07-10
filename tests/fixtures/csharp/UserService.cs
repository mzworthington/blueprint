using System;
using System.Threading.Tasks;
using TestProject.Domain;
using TestProject.Infrastructure;

namespace TestProject.Services
{
    public class UserService
    {
        private readonly DbContext _dbContext;
        private readonly MessageQueue _queue;

        public UserService(DbContext dbContext)
        {
            _dbContext = dbContext;
            _queue = new MessageQueue();
        }

        public async Task<User> GetUserByIdAsync(string id)
        {
            var user = await _dbContext.Users.FindAsync(id);
            _queue.Publish("user.fetched", user);
            return user;
        }
    }
}
