using System;
using System.Collections.Generic;
using System.Text;

namespace NetClient.Shared.Models
{
    public class NotificationItem
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string GroupType { get; set; } = string.Empty;

        public string GroupTitle { get; set; } = string.Empty;

        public string Type { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public bool IsRead { get; set; }

        public bool IsGrouped { get; set; } = true;
    }
}