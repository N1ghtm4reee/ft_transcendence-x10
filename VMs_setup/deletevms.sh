# shutdown Vms
vagrant halt

vagrant destroy -f

rm -rf ./vagrant

VBoxManage list vms | awk -F'"' '{print $2}' | xargs -I {} VBoxManage unregistervm {} --delete