#!/bin/bash
# Update CloudFront to use ALB as origin

DISTRIBUTION_ID="EVGL78PUPLVAV"
ALB_DNS="ccdh-frontend-alb-507609188.us-west-1.elb.amazonaws.com"

# Get current distribution config
aws cloudfront get-distribution-config --id $DISTRIBUTION_ID --region us-west-1 > current-config.json

# Extract ETag
ETAG=$(jq -r '.ETag' current-config.json)

# Extract just the config
jq '.DistributionConfig' current-config.json > distribution-config.json

# Update the origin to point to ALB
jq --arg alb_dns "$ALB_DNS" '
  .Origins.Items[0] = {
    "Id": "ALB-Frontend",
    "DomainName": $alb_dns,
    "OriginPath": "",
    "CustomHeaders": {
      "Quantity": 0
    },
    "CustomOriginConfig": {
      "HTTPPort": 80,
      "HTTPSPort": 443,
      "OriginProtocolPolicy": "http-only",
      "OriginSslProtocols": {
        "Quantity": 1,
        "Items": ["TLSv1.2"]
      },
      "OriginReadTimeout": 30,
      "OriginKeepaliveTimeout": 5
    },
    "ConnectionAttempts": 3,
    "ConnectionTimeout": 10,
    "OriginShield": {
      "Enabled": false
    },
    "OriginAccessControlId": ""
  } |
  .DefaultCacheBehavior.TargetOriginId = "ALB-Frontend" |
  .DefaultCacheBehavior.CachePolicyId = "658327ea-f89d-4fab-a63d-7e88639e58f6" |
  .DefaultCacheBehavior.ViewerProtocolPolicy = "redirect-to-https" |
  del(.DefaultCacheBehavior.MinTTL) |
  del(.DefaultCacheBehavior.MaxTTL) |
  del(.DefaultCacheBehavior.DefaultTTL) |
  del(.DefaultCacheBehavior.ForwardedValues) |
  .DefaultRootObject = "" |
  .Comment = "CCDH frontend distribution - ECS/ALB"
' distribution-config.json > updated-config.json

# Update the distribution
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --if-match $ETAG \
  --distribution-config file://updated-config.json \
  --region us-west-1

echo "CloudFront distribution updated to use ALB origin"
echo "Creating invalidation..."

# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --region us-west-1

# Clean up
rm -f current-config.json distribution-config.json updated-config.json

echo "Done!"