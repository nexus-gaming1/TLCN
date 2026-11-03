using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NexusControl.Models;
using SocketIOClient;

namespace NexusControl.Services
{
    public sealed class MachineSocketService : IAsyncDisposable
    {
        private readonly SocketIO _socket;

        public event Action<IReadOnlyDictionary<string, MachineSocketDto>>? MachinesUpdated;
        public event Action<MachineSocketDto>? MachineUpdated;

        public MachineSocketService(string apiBaseUrl)
        {
            var socketUrl = apiBaseUrl.TrimEnd('/');
            if (socketUrl.EndsWith("/api", StringComparison.OrdinalIgnoreCase))
            {
                socketUrl = socketUrl[..^4];
            }

            _socket = new SocketIO(new Uri(socketUrl));
            _socket.On("machines:list", context =>
            {
                var machines = context.GetValue<Dictionary<string, MachineSocketDto>>(0);
                if (machines != null)
                {
                    MachinesUpdated?.Invoke(machines);
                }

                return Task.CompletedTask;
            });
            _socket.On("machine:updated", context =>
            {
                var machine = context.GetValue<MachineSocketDto>(0);
                if (machine != null)
                {
                    MachineUpdated?.Invoke(machine);
                }

                return Task.CompletedTask;
            });
        }

        public Task ConnectAsync()
        {
            return _socket.ConnectAsync();
        }

        public async ValueTask DisposeAsync()
        {
            await _socket.DisconnectAsync();
            _socket.Dispose();
        }
    }
}
