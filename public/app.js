angular.module('app', ['angularUtils.directives.dirPagination']);

angular
    .module('app')
    .controller('appCtrl', AppCtrl);

AppCtrl.$inject = ['$scope', '$http'];

function AppCtrl($scope, $http) {

    $scope.currentPage = 1;
    $scope.pageSize = 20;
    $scope.totalCount = 0;

    var vm = this;
    vm.fields = [
        {label: 'Name', key: 'name'},
        {label: 'Email', key: 'email'},
        {label: 'Phone', key: 'phone'}
    ];
    vm.record = {};
    vm.records = [];
    vm.totalItems = 0;

    vm.handleError = function(response) {
        console.log(response.status + " - " + response.statusText + " - " + response.data);
    }

    vm.getAllRecords = function() {
        $http.get('/records').then(function(response){
            vm.records = response.data;
        }, function(response){
            vm.handleError(response);
        });
    }

    //vm.getAllRecords();
    

    vm.editMode = false;
    vm.saveRecord = function() {
        if(vm.editMode) {
            vm.updateRecord();
        } else {
            vm.addRecord();
        }
    }

    vm.addRecord = function() {
        console.log(vm.record);
        $http.post('/records', vm.record).then(function(response){
            vm.record = {};
            vm.getAllRecords();
        }, function(response){
            vm.handleError(response);
        });
    }

    vm.updateRecord = function() {
        $http.put('/records/' + vm.record._id, vm.record).then(function(response){
            vm.record = {};
            vm.getAllRecords();
            vm.editMode = false;
        }, function(response){
            vm.handleError(response);
        });
    }

    vm.editRecord = function(record) {
        vm.record = record;
        vm.editMode = true;
    }

    vm.deleteRecord = function(recordid) {
        $http.delete('/records/'+recordid).then(function(response){
            console.log("Deleted");
            vm.getAllRecords();
        }, function(response){
            vm.handleError(response);
        })
    }

    vm.cancelEdit = function() {
        vm.editMode = false;
        vm.record = {};
        vm.getAllRecords();
    }
    
    vm.getPartialRecords = function (num) {
        $http.get('/records/' + num).then(function (response) {
            vm.records = response.data;
        }, function (response) {
            vm.handleError(response);
        });
    }
    //with cache
    vm.getRecordsCount = function () {
        $http.get('/recordscount').then(function (response) {
            vm.totalItems = response.data;
        }, function (response) {
            vm.handleError(response);
        });
    }
    vm.getRecordsCount();
    vm.getPartialRecords($scope.currentPage);

    //vm.getAllRecords();

    $scope.pageChangeHandler = function (num) {
        console.log('Page Changed To : ' + num);
        vm.getPartialRecords(num);
        $scope.currentPage = num;
    };

}
