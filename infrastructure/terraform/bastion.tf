# Bastion Host Configuration for RDS Access

# Bastion Host Security Group
resource "aws_security_group" "bastion" {
  name        = "${var.project_name}-bastion-sg"
  description = "Security group for bastion host"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # TODO: Replace with your specific IP address for security
    description = "SSH access"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-bastion-sg"
  }
}

# Update RDS security group to allow bastion
resource "aws_security_group_rule" "rds_from_bastion" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.bastion.id
  security_group_id        = aws_security_group.rds.id
  description              = "PostgreSQL from bastion"
}

# Generate SSH key pair
resource "tls_private_key" "bastion_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "bastion_key" {
  key_name   = "${var.project_name}-bastion-key"
  public_key = tls_private_key.bastion_key.public_key_openssh
}

# Data source for latest Amazon Linux 2023
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-kernel-*-x86_64"]  # Using x86_64 for t3.nano
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Bastion Host EC2 Instance
resource "aws_instance" "bastion" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.nano"  # Cheapest x86 instance type (~$3.80/month + ~$2.40 for 30GB storage)
  
  subnet_id                   = tolist(data.aws_subnets.default.ids)[0]
  vpc_security_group_ids      = [aws_security_group.bastion.id]
  key_name                    = aws_key_pair.bastion_key.key_name
  associate_public_ip_address = true

  # Enable termination protection for production
  disable_api_termination = false

  # Use gp3 for better performance/cost ratio
  root_block_device {
    volume_type = "gp3"
    volume_size = 30  # Minimum required for Amazon Linux 2023
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    # Update system
    dnf update -y
    
    # Install PostgreSQL client
    dnf install -y postgresql15
    
    # Install useful tools
    dnf install -y htop tmux vim
    
    # Create MOTD
    cat > /etc/motd << 'MOTD'
    
    ===============================================
    CCDH Bastion Host - Database Access Gateway
    ===============================================
    
    To connect to RDS:
    psql -h ${aws_rds_cluster.main.endpoint} -U appuser -d appdb
    
    Remember to stop this instance when not in use:
    sudo shutdown -h now
    
    ===============================================
    MOTD
  EOF

  tags = {
    Name = "${var.project_name}-bastion"
    Type = "bastion"
  }
}

# Elastic IP for consistent access (optional - adds $3.60/month)
# Uncomment if you want a static IP
# resource "aws_eip" "bastion" {
#   instance = aws_instance.bastion.id
#   domain   = "vpc"
#   
#   tags = {
#     Name = "${var.project_name}-bastion-eip"
#   }
# }

# Output bastion details
output "bastion_public_ip" {
  value = aws_instance.bastion.public_ip
  description = "Public IP of bastion host"
}

output "bastion_instance_id" {
  value = aws_instance.bastion.id
  description = "Instance ID of bastion host"
}

output "bastion_private_key" {
  value     = tls_private_key.bastion_key.private_key_pem
  sensitive = true
  description = "Private key for bastion SSH access"
}

output "bastion_ssh_command" {
  value = "ssh -i ~/.ssh/${var.project_name}-bastion.pem ec2-user@${aws_instance.bastion.public_ip}"
  description = "SSH command to connect to bastion"
}

output "bastion_tunnel_command" {
  value = "ssh -i ~/.ssh/${var.project_name}-bastion.pem -L 5432:${aws_rds_cluster.main.endpoint}:5432 ec2-user@${aws_instance.bastion.public_ip}"
  description = "SSH tunnel command for local database access"
}