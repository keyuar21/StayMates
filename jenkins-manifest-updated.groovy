pipeline {
    agent any

    environment {
        AWS_REGION = "ap-south-1"
        ECR_REPO = "563765641164.dkr.ecr.ap-south-1.amazonaws.com/staymates-app"
        IMAGE_TAG = "latest"
        KUBECONFIG = "/var/lib/jenkins/workspace/StaymatesCICD/kubeconfig"
        KUBE_NAMESPACE = "rolling-ns"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/keyuar21/StayMates.git'
            }
        }

        stage('Login to AWS ECR') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} \
                    | docker login --username AWS --password-stdin ${ECR_REPO}
                """
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t staymates-app ."
            }
        }

        stage('Tag the Image') {
            steps {
                sh "docker tag staymates-app:latest ${ECR_REPO}:${IMAGE_TAG}"
            }
        }

        stage('Push Docker Image to ECR') {
            steps {
                sh "docker push ${ECR_REPO}:${IMAGE_TAG}"
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh """
                    export KUBECONFIG=${KUBECONFIG}
                    echo "Triggering rolling update..."
                    kubectl apply -f staymates-deployment.yml -n ${KUBE_NAMESPACE}
                """
            }
        }

        stage('Verify Deployment') {
            steps {
                sh """
                    export KUBECONFIG=${KUBECONFIG}
                    echo "=== Deployment Status ==="
                    kubectl get deployment staymates -n ${KUBE_NAMESPACE}
                    
                    echo "=== Pod Status ==="
                    kubectl get pods -n ${KUBE_NAMESPACE} -l app=staymates
                    
                    echo "=== Service Status ==="
                    kubectl get service staymates-service -n ${KUBE_NAMESPACE}
                    
                    echo "=== Application Endpoints ==="
                    echo "Internal: http://\$(kubectl get service staymates-service -n ${KUBE_NAMESPACE} -o jsonpath='{.spec.clusterIP}'):3000"
                    echo "External: http://\$(curl -s ifconfig.me):30000"
                """
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completed successfully! New image deployed to Kubernetes."
        }
        failure {
            echo "❌ Pipeline failed. Check logs for details."
        }
        always {
            sh "docker rmi staymates-app:latest ${ECR_REPO}:${IMAGE_TAG} || true"
        }
    }
}
