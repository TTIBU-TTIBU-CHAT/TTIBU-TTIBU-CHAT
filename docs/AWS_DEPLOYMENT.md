# AWS 배포 가이드

## 아키텍처 개요

```
                            Internet
                               |
                     [Application Load Balancer]
                        (Public Subnet A/C)
                               |
                     +---------+---------+
                     |                   |
            [NAT Gateway A]      [NAT Gateway C]
            (Public Subnet)      (Public Subnet)
                     |                   |
            +--------+--------+----------+--------+
            |                                     |
      [EC2 Instance]                    [Standby for Multi-AZ]
   (Private Subnet A)                  (Private Subnet C)
    - Frontend (Nginx)
    - Core API (Spring Boot)
    - Summary API (FastAPI)
    - LiteLLM Proxy
            |
            +--------------------+--------------------+
            |                    |                    |
    [RDS PostgreSQL]      [ElastiCache]         [S3]
     (Multi-AZ)            (Single-AZ)    (litellm-config.yaml)
```


## 1단계: VPC 및 네트워크 구성

### 1.1 VPC 생성

```bash
# VPC 생성
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=ttibu-vpc}]'

# VPC ID 저장
export VPC_ID=<vpc-id>
```

### 1.2 Subnet 생성

```bash
# Public Subnet A (us-east-1a)
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ttibu-public-a}]'

# Public Subnet C (us-east-1c)
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1c \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ttibu-public-c}]'

# Private Subnet A (us-east-1a)
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ttibu-private-a}]'

# Private Subnet C (us-east-1c)
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.12.0/24 \
  --availability-zone us-east-1c \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=ttibu-private-c}]'
```

### 1.3 Internet Gateway 및 NAT Gateway

```bash
# Internet Gateway 생성
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=ttibu-igw}]'

export IGW_ID=<igw-id>

# VPC에 IGW 연결
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID

# Elastic IP 할당 (NAT Gateway용)
aws ec2 allocate-address --domain vpc
export EIP_A=<allocation-id>

aws ec2 allocate-address --domain vpc
export EIP_C=<allocation-id>

# NAT Gateway 생성 (A)
aws ec2 create-nat-gateway \
  --subnet-id <public-subnet-a-id> \
  --allocation-id $EIP_A \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=ttibu-nat-a}]'

# NAT Gateway 생성 (C)
aws ec2 create-nat-gateway \
  --subnet-id <public-subnet-c-id> \
  --allocation-id $EIP_C \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=ttibu-nat-c}]'
```

### 1.4 Route Tables

**Public Route Table:**
```bash
# Public route table 생성
aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=ttibu-public-rt}]'

export PUBLIC_RT_ID=<route-table-id>

# Internet Gateway로 라우팅
aws ec2 create-route \
  --route-table-id $PUBLIC_RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID

# Public Subnet들과 연결
aws ec2 associate-route-table --subnet-id <public-subnet-a-id> --route-table-id $PUBLIC_RT_ID
aws ec2 associate-route-table --subnet-id <public-subnet-c-id> --route-table-id $PUBLIC_RT_ID
```

**Private Route Table A:**
```bash
aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=ttibu-private-rt-a}]'

export PRIVATE_RT_A_ID=<route-table-id>

aws ec2 create-route \
  --route-table-id $PRIVATE_RT_A_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id <nat-gateway-a-id>

aws ec2 associate-route-table --subnet-id <private-subnet-a-id> --route-table-id $PRIVATE_RT_A_ID
```

**Private Route Table C:**
```bash
aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=ttibu-private-rt-c}]'

export PRIVATE_RT_C_ID=<route-table-id>

aws ec2 create-route \
  --route-table-id $PRIVATE_RT_C_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id <nat-gateway-c-id>

aws ec2 associate-route-table --subnet-id <private-subnet-c-id> --route-table-id $PRIVATE_RT_C_ID
```

## 2단계: Security Groups

### 2.1 ALB Security Group

```bash
aws ec2 create-security-group \
  --group-name ttibu-alb-sg \
  --description "Security group for TTIBU ALB" \
  --vpc-id $VPC_ID

export ALB_SG_ID=<security-group-id>

# HTTP
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

### 2.2 EC2 Security Group

```bash
aws ec2 create-security-group \
  --group-name ttibu-ec2-sg \
  --description "Security group for TTIBU EC2" \
  --vpc-id $VPC_ID

export EC2_SG_ID=<security-group-id>

# ALB에서 80 포트
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 80 \
  --source-group $ALB_SG_ID

# SSH (관리용 - 필요시)
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr <your-ip>/32
```

### 2.3 RDS Security Group

```bash
aws ec2 create-security-group \
  --group-name ttibu-rds-sg \
  --description "Security group for TTIBU RDS" \
  --vpc-id $VPC_ID

export RDS_SG_ID=<security-group-id>

# EC2에서 PostgreSQL 접근
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $EC2_SG_ID
```

### 2.4 ElastiCache Security Group

```bash
aws ec2 create-security-group \
  --group-name ttibu-redis-sg \
  --description "Security group for TTIBU Redis" \
  --vpc-id $VPC_ID

export REDIS_SG_ID=<security-group-id>

# EC2에서 Redis 접근
aws ec2 authorize-security-group-ingress \
  --group-id $REDIS_SG_ID \
  --protocol tcp \
  --port 6379 \
  --source-group $EC2_SG_ID
```

## 3단계: RDS PostgreSQL 생성

### 3.1 DB Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name ttibu-db-subnet-group \
  --db-subnet-group-description "Subnet group for TTIBU RDS" \
  --subnet-ids <private-subnet-a-id> <private-subnet-c-id>
```

### 3.2 RDS Instance 생성

```bash
aws rds create-db-instance \
  --db-instance-identifier ttibu-postgres \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16.3 \
  --master-username postgres \
  --master-user-password <your-secure-password> \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name ttibu-db-subnet-group \
  --db-name ttibu_db \
  --multi-az \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --publicly-accessible false \
  --tags Key=Name,Value=ttibu-postgres
```

## 4단계: ElastiCache Redis 생성

### 4.1 Cache Subnet Group

```bash
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name ttibu-redis-subnet-group \
  --cache-subnet-group-description "Subnet group for TTIBU Redis" \
  --subnet-ids <private-subnet-a-id>
```

### 4.2 Redis Cluster 생성

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id ttibu-redis \
  --cache-node-type cache.t4g.micro \
  --engine redis \
  --engine-version 7.1 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name ttibu-redis-subnet-group \
  --security-group-ids $REDIS_SG_ID \
  --preferred-availability-zone us-east-1a \
  --tags Key=Name,Value=ttibu-redis
```

## 5단계: S3 버킷 생성

### 5.1 Config Bucket (litellm-config.yaml)

```bash
# Config 버킷 생성
aws s3 mb s3://ttibu-config-bucket --region us-east-1

# Public access 차단
aws s3api put-public-access-block \
  --bucket ttibu-config-bucket \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# litellm-config.yaml 업로드
aws s3 cp litellm-config.yaml s3://ttibu-config-bucket/litellm-config.yaml
```

### 5.2 CodeDeploy Bucket (배포 패키지)

```bash
# CodeDeploy 버킷 생성
aws s3 mb s3://ttibu-codedeploy-bucket --region us-east-1

# Public access 차단
aws s3api put-public-access-block \
  --bucket ttibu-codedeploy-bucket \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

## 6단계: IAM Roles

### 6.1 EC2 Instance Profile

**Trust Policy (ec2-trust-policy.json):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**IAM Role 생성:**
```bash
aws iam create-role \
  --role-name ttibu-ec2-role \
  --assume-role-policy-document file://ec2-trust-policy.json

# S3 읽기 권한
aws iam attach-role-policy \
  --role-name ttibu-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# ECR Public 읽기 권한
aws iam attach-role-policy \
  --role-name ttibu-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

# Instance Profile 생성
aws iam create-instance-profile \
  --instance-profile-name ttibu-ec2-instance-profile

aws iam add-role-to-instance-profile \
  --instance-profile-name ttibu-ec2-instance-profile \
  --role-name ttibu-ec2-role
```

### 6.2 CodeDeploy Service Role

**Trust Policy (codedeploy-trust-policy.json):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codedeploy.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**IAM Role 생성:**
```bash
aws iam create-role \
  --role-name ttibu-codedeploy-role \
  --assume-role-policy-document file://codedeploy-trust-policy.json

aws iam attach-role-policy \
  --role-name ttibu-codedeploy-role \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeDeployRole
```

## 7단계: EC2 Instance 생성

### 7.1 User Data Script

**user-data.sh:**
```bash
#!/bin/bash
set -e

# 시스템 업데이트
yum update -y

# Docker 설치
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Docker Compose 설치
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# CodeDeploy Agent 설치
yum install -y ruby wget
cd /home/ec2-user
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
./install auto
systemctl start codedeploy-agent
systemctl enable codedeploy-agent

# 애플리케이션 디렉토리 생성
mkdir -p /home/ec2-user/ttibu-app
chown ec2-user:ec2-user /home/ec2-user/ttibu-app

# 환경변수 설정
echo "export S3_CONFIG_BUCKET=ttibu-config-bucket" >> /home/ec2-user/.bashrc
```

### 7.2 EC2 Launch

```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name <your-key-pair> \
  --subnet-id <private-subnet-a-id> \
  --security-group-ids $EC2_SG_ID \
  --iam-instance-profile Name=ttibu-ec2-instance-profile \
  --user-data file://user-data.sh \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ttibu-app-server}]'
```

## 8단계: Application Load Balancer

### 8.1 ALB 생성

```bash
aws elbv2 create-load-balancer \
  --name ttibu-alb \
  --subnets <public-subnet-a-id> <public-subnet-c-id> \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --tags Key=Name,Value=ttibu-alb

export ALB_ARN=<load-balancer-arn>
```

### 8.2 Target Group 생성

```bash
aws elbv2 create-target-group \
  --name ttibu-frontend-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-path / \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 2 \
  --target-type instance

export TG_ARN=<target-group-arn>

# EC2 인스턴스를 Target Group에 등록
aws elbv2 register-targets \
  --target-group-arn $TG_ARN \
  --targets Id=<ec2-instance-id>
```

### 8.3 Listener 생성

```bash
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

## 9단계: CodeDeploy 설정

### 9.1 CodeDeploy Application 생성

```bash
aws deploy create-application \
  --application-name ttibu-app \
  --compute-platform Server
```

### 9.2 Deployment Group 생성

```bash
aws deploy create-deployment-group \
  --application-name ttibu-app \
  --deployment-group-name ttibu-deployment-group \
  --service-role-arn arn:aws:iam::<account-id>:role/ttibu-codedeploy-role \
  --ec2-tag-filters Key=Name,Value=ttibu-app-server,Type=KEY_AND_VALUE \
  --deployment-config-name CodeDeployDefault.OneAtATime \
  --auto-rollback-configuration enabled=true,events=DEPLOYMENT_FAILURE
```

## 10단계: GitHub Secrets 설정

GitHub Repository → Settings → Secrets and variables → Actions에서 다음을 추가:

| Secret Name | Value |
|-------------|-------|
| `AWS_ACCESS_KEY_ID` | IAM User Access Key |
| `AWS_SECRET_ACCESS_KEY` | IAM User Secret Key |
| `AWS_REGION` | `us-east-1` |
| `ECR_PUBLIC_ALIAS` | ECR Public alias (예: `a1b2c3d4`) |
| `CODEDEPLOY_S3_BUCKET` | `ttibu-codedeploy-bucket` |
| `CODEDEPLOY_APP_NAME` | `ttibu-app` |
| `CODEDEPLOY_GROUP_NAME` | `ttibu-deployment-group` |

## 11단계: EC2에 환경변수 설정

SSH로 EC2에 접속:
```bash
ssh -i your-key.pem ec2-user@<ec2-private-ip>
```

`.env` 파일 생성:
```bash
cd /home/ec2-user/ttibu-app
vi .env
```

`.env.prod.example`을 참고하여 실제 값 입력

## 12단계: 배포

GitHub Actions에서 수동으로 워크플로우 트리거:

1. GitHub Repository → Actions 탭
2. "Build and Push to ECR Public" 워크플로우 선택
3. "Run workflow" 클릭
4. Service 선택 (all, frontend, core-api, summary-api)
5. "Run workflow" 버튼 클릭

배포 진행 상황:
- GitHub Actions: ECR 빌드/푸시 → CodeDeploy 트리거
- AWS CodeDeploy Console: 배포 상태 모니터링
- EC2: `docker-compose -f docker-compose.prod.yml ps` 확인

## 13단계: 검증

### ALB DNS로 접속
```bash
# ALB DNS 확인
aws elbv2 describe-load-balancers \
  --names ttibu-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

브라우저에서 `http://<alb-dns-name>` 접속

### 헬스체크
```bash
# EC2에서
curl http://localhost:80
curl http://localhost:8080/actuator/health
curl http://localhost:8001/health
```

## 비용 절감 팁 (4일 운영)

1. **사용 후 즉시 삭제**: 포폴 시연 후 모든 리소스 삭제
2. **NAT Gateway 대안**: VPC 엔드포인트 사용 (S3, ECR) → NAT Gateway 비용 절감
3. **ElastiCache 대신 EC2 Redis**: docker-compose에 Redis 포함 (Single Point of Failure 감수)
4. **RDS 대신 EC2 PostgreSQL**: docker-compose에 PostgreSQL 포함 (데이터 영속성 감수)

**최소 구성 (Multi-AZ ALB만 유지):**
- ALB (Multi-AZ) + EC2 1대 + docker-compose (모든 서비스)
- 4일 비용: ~$10

## 리소스 정리 (4일 후)

```bash
# 역순으로 삭제
aws deploy delete-deployment-group --application-name ttibu-app --deployment-group-name ttibu-deployment-group
aws deploy delete-application --application-name ttibu-app
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN
aws elbv2 delete-target-group --target-group-arn $TG_ARN
aws ec2 terminate-instances --instance-ids <ec2-instance-id>
aws elasticache delete-cache-cluster --cache-cluster-id ttibu-redis
aws rds delete-db-instance --db-instance-identifier ttibu-postgres --skip-final-snapshot
aws ec2 delete-nat-gateway --nat-gateway-id <nat-gateway-a-id>
aws ec2 delete-nat-gateway --nat-gateway-id <nat-gateway-c-id>
aws ec2 release-address --allocation-id $EIP_A
aws ec2 release-address --allocation-id $EIP_C
# VPC, Subnet, Security Group 등도 삭제
```

## 트러블슈팅

### 문제: CodeDeploy 배포 실패
- EC2에서 CodeDeploy Agent 상태 확인: `sudo systemctl status codedeploy-agent`
- 로그 확인: `/var/log/aws/codedeploy-agent/codedeploy-agent.log`

### 문제: Docker 이미지 pull 실패
- ECR Public 로그인 확인: `aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws`
- IAM Role 권한 확인

### 문제: RDS 연결 실패
- Security Group 확인
- RDS 엔드포인트 확인: `aws rds describe-db-instances --db-instance-identifier ttibu-postgres`
- `.env` 파일 환경변수 확인
