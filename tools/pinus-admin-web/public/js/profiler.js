Ext.onReady(function() {
	Ext.BLANK_IMAGE_URL = '../ext-4.0.7-gpl/resources/themes/images/default/tree/s.gif';

	// server comboBox
	var serverStore = Ext.create('Ext.data.Store', {
		fields: ['name', 'serverId']
	});
	var serverCom = Ext.create('Ext.form.ComboBox', {
		id: 'serverComId',
		fieldLabel: 'server',
		labelWidth: 60,
		store: serverStore,
		queryMode: 'local',
		displayField: 'serverId',
		valueField: 'name'
	});

	// type comboBox
	var typeStore = Ext.create('Ext.data.Store', {
		fields: ['type']
	});

	var typeCom = Ext.create('Ext.form.ComboBox', {
		id: 'typeComId',
		fieldLabel: '&nbsp;&nbsp;&nbsp;&nbsp;  Type',
		labelWidth: 60,
		store: typeStore,
		queryMode: 'local',
		displayField: 'type',
		valueField: 'type',
	});
	// 设置默认的type
	typeStore.loadData([
		{type:'cpuprofile'}, 
		{type:'heapprofile'},
		{type:'heapsnapshot'}
	])

	// 初始化一个空的文件列表数据
	const fileData = [];

	// 创建文件列表的数据模型
	Ext.define('FileModel', {
		extend: 'Ext.data.Model',
		fields: ['name', 'size']
	});

	// 创建文件列表的数据存储
	const fileStore = Ext.create('Ext.data.Store', {
		model: 'FileModel',
		data: fileData
	});

	// 创建 Grid 列
	const columns = [
		{ text: 'profile文件名', dataIndex: 'name', flex: 1 },
		{ text: '文件大小', dataIndex: 'size', flex: 1},
	];
	
	// 创建文件列表 Grid
	const fileGrid = Ext.create('Ext.grid.Panel', {
		id: 'fileGirdId',
		store: fileStore,
		columns: columns,
	});


	var runProfilePanel = Ext.create('Ext.form.FormPanel', {
		bodyPadding: 10,
		autoScroll: true,
		autoShow: true,
		renderTo: Ext.getBody(),
		region: 'center',
		items: [
		{
			layout: 'column',
			border: false,
			anchor: '95%',
			items: [serverCom, typeCom, 
			{
				//colspan: 2,
				xtype: 'button',
				text: 'start',
				handler: startProf,
				columnWidth: 0.08,
				margin: '0 30 0 0'
			}, {
				//colspan: 2,
				xtype: 'button',
				text: 'stop',
				handler: stopProf,
				columnWidth: 0.08,
				margin: '0 10 0 0'
			}]
		}, {
			xtype: 'label',
			text: '运行结果:'
			// height:20
		}, {
			xtype: 'textareafield',
			id: 'tesultTextId',
			height: 50,
			name: 'scriptId',
			anchor: '95%'
		},{
			height: 550,
			anchor: '95%',
			items:[fileGrid]
		},	{
			anchor: '95%',
			layout: 'column',

			items: [
				// 下载按钮
				{
					xtype: 'button',
					text: '下载',
					handler: downloadFile,
					margin: '10 0 10 100',
					width: 150,
					
				},
				// 删除按钮
				{
					xtype: 'button',
					text: '删除',
					handler: deleteFile,
					margin: '10 0 10 100',
					width: 150,
					
				}
			]
			

		}
	]
	});

	list();

	var viewport = new Ext.Viewport({
		layout: 'border',
		items: [runProfilePanel]
	});

	
});

function startProf() {
	var profileType = Ext.getCmp('typeComId').getValue();
	var serverId = Ext.getCmp('serverComId').getValue();
	if (!serverId || serverId.length < 1) {
		alert('serverId is required!');
		return;
	}
	if (!profileType || profileType.length < 1) {
		alert('profiler type is required!');
		return;
	}

	window.parent.client.request('profiler', {
		action: 'start',
		serverId: serverId,
		type: profileType,
	}, function(err, msg) {
		if (err) {
			alert(err);
			return;
		}
		Ext.getCmp('tesultTextId').setValue(msg.result);
	});
}

function stopProf() {
	var profileType = Ext.getCmp('typeComId').getValue();
	var serverId = Ext.getCmp('serverComId').getValue();
	if (!serverId || serverId.length < 1) {
		alert('serverId is required!');
		return;
	}
	if (!profileType || profileType.length < 1) {
		alert('profiler type is required!');
		return;
	}

	window.parent.client.request('profiler', {
		action: 'stop',
		serverId: serverId,
		type: profileType,
	}, function(err, msg) {
		if (err) {
			alert(err);
			return;
		}
		Ext.getCmp('tesultTextId').setValue(`停止profile，生成${msg.name}文件`);
		addFile(msg.name, msg.size);
	});
}

// 显示profile文件列表，显示服务器列表
var list = function() {
	window.parent.client.request('profiler', {
		action: 'list'
	}, function(err, msg) {
		if (err) {
			alert(err);
			return;
		}
		var servers = [],
			profiles = msg.profiles,
			i, l, item;
		for (i = 0, l = msg.servers.length; i < l; i++) {
			item = msg.servers[i];
			servers.push({
				name: item,
				serverId: item
			});
		}

		servers.sort(function(o1, o2) {
			return o1.name.localeCompare(o2);
		});

		profiles.sort(function(o1, o2) {
			return o1.name.localeCompare(o2);
		});


		Ext.getCmp('serverComId').getStore().loadData(servers);
		// 显示profile文件列表
		//Ext.getCmp('fileGirdId').getStore().loadData(profiles);
		for(let profile of profiles){
			Ext.getCmp('fileGirdId').getStore().add({name: profile.name, size: profile.size});
		}
    });
};


// 下载文件的函数
function downloadFile() {
	var selectedRecords = Ext.getCmp('fileGirdId').getSelectionModel().getSelection();
	if(selectedRecords.length !=1){
		alert("请选择一个文件");
		return;
	}
	var fileName = selectedRecords[0].get('name');
	window.parent.client.request('profiler', {
		action: 'get', filename: fileName }, function(err,msg){
			if (err) {
				alert(err);
				return;
			}
			const blob = new Blob([msg], { type: 'application/json' });
			const downloadLink = document.createElement('a');
			downloadLink.href = window.URL.createObjectURL(blob);
			  // 设置下载链接的文件名
  			downloadLink.download = fileName;
			document.body.appendChild(downloadLink);
			downloadLink.click();
			document.body.removeChild(downloadLink);
			Ext.getCmp('tesultTextId').setValue(`下载${fileName}文件...`);
		});
}

// 删除文件的函数
function deleteFile(fileName) {
	var selectedRecords = Ext.getCmp('fileGirdId').getSelectionModel().getSelection();
	if(selectedRecords.length !=1){
		alert("请选择一个文件");
		return;
	}
	var fileName = selectedRecords[0].get('name');
	window.parent.client.request('profiler', {
		action: 'delete', filename: fileName }, function(err,msg){
			if (err) {
				alert(err);
				return;
			}
			console.log(`删除文件: ${fileName}`);
			Ext.getCmp('fileGirdId').getStore().remove(selectedRecords)
			Ext.getCmp('tesultTextId').setValue(`删除${fileName}文件成功`);
		});
}

// 动态增加文件
function addFile(name, size) {
	Ext.getCmp('fileGirdId').getStore().add({name: name, size: size});
}