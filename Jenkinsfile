pipeline {
    agent any

    environment {
        registry = "n1ghtm4r3e"              // your DockerHub username
        registryCredential = "DOCKERHUB_LOGIN" // Jenkins credential ID for DockerHub
        commitHash = "${env.GIT_COMMIT[0..6]}" // short commit hash for tagging
    }

    stages {
        stage('Checkout Source') {
            steps {
                git branch: 'main', url: 'https://github.com/N1ghtm4reee/ft_transcendence-x10.git'
            }
        }

        stage('Build') {
            steps {
                sh '''
                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v $PWD:/app -w /app \
                docker/compose:2.17.3 -f docker-compose.backend.yml build
                '''
            }
        }

        stage('Test') {
            steps {
                sh '''
                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v $PWD:/app -w /app \
                docker/compose:2.17.3 -f docker-compose.backend.yml up -d
                sleep 10
                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v $PWD:/app -w /app \
                docker/compose:2.17.3 -f docker-compose.backend.yml down
                '''
            }
        }


        stage('Push to DockerHub') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', registryCredential) {
                        // Push each service image (from docker-compose.backend.yml)
                        def services = ["api-gateway", "auth-service", "user-service"]
                        for (svc in services) {
                            sh """
                              docker tag ${registry}/${svc}:latest ${registry}/${svc}:${commitHash}
                              docker push ${registry}/${svc}:latest
                              docker push ${registry}/${svc}:${commitHash}
                            """
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Cleaning up Docker..."
            sh 'docker system prune -af || true'
        }
    }
}
