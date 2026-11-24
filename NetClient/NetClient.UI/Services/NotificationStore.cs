using NetClient.Shared.Models;
using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;
namespace NetClient.UI.Services
{

    public class NotificationStore
    {
        private readonly List<NotificationItem> _notifications = new();
        private readonly object _lock = new();

            public event Action? NotificationsChanged;

        public int TotalUnread
        {
            get
            {
                lock (_lock)
                    return _notifications.Count(x => !x.IsRead);
            }
        }

        public void Add(NotificationItem notification)
        {
            lock (_lock)
            {
                _notifications.Insert(0, notification);
            }

            NotificationsChanged?.Invoke();
        }

        public List<NotificationGroup> GetGroups()
        {
            lock (_lock)
            {
                return _notifications
                    .GroupBy(x => x.Type)
                    .Select(group => new NotificationGroup
                    {
                        Type = group.Key,

                        // Title do backend cung cấp
                        Title = group.First().Title,

                        Items = group.ToList(),
                    })
                    .ToList();
            }
        }

        public void MarkAsRead(Guid id)
        {
            lock (_lock)
            {
                var notification = _notifications.FirstOrDefault(x => x.Id == id);

                if (notification == null || notification.IsRead)
                    return;

                notification.IsRead = true;
            }

            NotificationsChanged?.Invoke();
        }

        public void MarkAllAsRead()
        {
            lock (_lock)
            {
                foreach (var notification in _notifications)
                    notification.IsRead = true;
            }

            NotificationsChanged?.Invoke();
        }

        public void Remove(Guid id)
        {
            lock (_lock)
            {
                _notifications.RemoveAll(x => x.Id == id);
            }

            NotificationsChanged?.Invoke();
        }

        public void Clear()
        {
            lock (_lock)
            {
                _notifications.Clear();
            }

            NotificationsChanged?.Invoke();
        }
    }

   
}

