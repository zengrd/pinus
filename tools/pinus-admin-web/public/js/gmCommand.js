Ext.onReady(function() {

	Ext.BLANK_IMAGE_URL = '../ext-4.0.7-gpl/resources/themes/images/default/tree/s.gif';

	flagObject = {};
	gmObject = {};

	//flag comboBox
	var flagStore = Ext.create('Ext.data.Store', {
		fields: ['name', 'flagId']
	});

	var flagCom = Ext.create('Ext.form.ComboBox', {
		id: 'flagComId',
		fieldLabel: '指令类别',
		labelWidth: 60,
		store: flagStore,
		queryMode: 'local',
		displayField: 'flagId',
		valueField: 'name',
		listeners: {
			select: {
				fn: function() {
					var value = flagCom.getValue();
					var gmCommands = []
					for(let key of flagObject[value]){
						gmCommands.push({
							name: key,
							gmCommand: key
						})
					}
					Ext.getCmp('gmCommandComId').getStore().loadData(gmCommands);
				}
			}
		}
	});

	//gmCommand comboBox
	var gmCommandStore = Ext.create('Ext.data.Store', {
		fields: ['name', 'gmCommand']
	});

	var gmCommandCom = Ext.create('Ext.form.ComboBox', {
		id: 'gmCommandComId',
		fieldLabel: '指令列表',
		labelWidth: 80,
		store: gmCommandStore,
		queryMode: 'local',
		displayField: 'gmCommand',
		valueField: 'name',
		listeners: {
			select: {
				fn: function() {
					var value = gmCommandCom.getValue();
					setDesc(value);
				}
			}
		}
	});

	var rungmCommandPanel = Ext.create('Ext.form.FormPanel', {
		bodyPadding: 10,
		autoScroll: true,
		autoShow: true,
		renderTo: Ext.getBody(),
		region: 'center',
		items: [{
			layout: 'column',
			border: false,
			anchor: '95%',
			items: [{
				xtype: 'label',
				text: '选择指令:',
				columnWidth: .99
			},
			flagCom, gmCommandCom]
		}, {
			xtype: 'label',
			height: 20,
			id: 'gmCommandDescId',
			anchor: '95%'
		}, {
			xtype: 'textareafield',
			height: 150,
			//region: 'center',
			id: 'gmCommandAreaId',
			anchor: '95%'
		}, {
			layout: 'column',
			anchor: '95%',
			border: false,
			items: [{
				// colspan: 2
				xtype: 'button',
				text: 'Run',
				handler: run,
				width: 150,
				margin: '10 0 10 900'
			}, {
				// colspan: 2
				xtype: 'button',
				text: 'Save',
				handler: saveForm,
				width: 150,
				margin: '10 0 10 100'
			}]
		}, {
			xtype: 'label',
			text: '执行结果:'
			// height:20
		}, {
			xtype: 'textareafield',
			id: 'tesultTextId',
			height: 150,
			name: 'gmCommandId',
			anchor: '95%'
		}]
	});

	list();
	new Ext.Viewport({
		layout: 'border',
		items: [rungmCommandPanel]
	});
});

var saveForm = function() {
	var saveForm = Ext.create('Ext.form.Panel', {
		frame: true,
		bodyStyle: 'padding:2px 2px 0',
		width: 300,
		// defaultType: 'textfield',
		// renderTo: Ext.getBody(),
		anchor: '100%',
		fieldDefaults: {
			msgTarget: 'side',
			labelWidth: 50
		},
		items: [{
			xtype: 'textfield',
			id: 'gmCommandNameId',
			fieldLabel: 'name',
			name: 'gmCommandName',
			allowBlank: false,
			width: 250,
			value: Ext.getCmp('gmCommandComId').getValue()
		}],
		buttons: [{
			text: 'Save',
			handler: save
		}, {
			text: 'Cancel',
			handler: cancel
		}]
	});

	var win = Ext.create('Ext.window.Window', {
		id: 'saveWinId',
		title: '保存指令',
		height: 100,
		width: 320,
		layout: 'fit',
		anchor: '100%',
		items: [saveForm]
	});

	win.show();
};

var cancel = function() {
	Ext.getCmp('saveWinId').close();
};

var list = function() {
	window.parent.client.request('gmCommand', {
		command: 'list'
	}, function(err, msg) {
		if (err) {
			alert(err);
			return;
		}
		gmObject = msg.commands;
		let flags = [];
		let flag;
		console.log(msg);
		// 形成标签和指令名字的对应关系
		for(let key in msg.commands){
			flag = msg.commands[key].flag
			if(flagObject.hasOwnProperty(flag)){
				flagObject[flag].push(key);
			}
			else{
				flagObject[flag] = [key,];
			}
		}
		console.log(flagObject);
		for(let flag in flagObject){
			flags.push({
				name: flag,
				flagId: flag
			})
		}

		//初始化两个组件
		console.log('flags',flags);
		Ext.getCmp('flagComId').getStore().loadData(flags);
		flag = flags[0];
		console.log('flag', flag);
		var gmCommands = []
		for(let key of flagObject[flag.name]){
			gmCommands.push({
				name: key,
				gmCommand: key
			})
		}
		Ext.getCmp('gmCommandComId').getStore().loadData(gmCommands);
	});
};


//run the gmCommand
var run = function() {
	var args = Ext.getCmp('gmCommandAreaId').getValue();
	var command = Ext.getCmp('gmCommandComId').getValue();

	window.parent.client.request('gmCommand', {
		command: command,
		args: [args,]
	}, function(err, msg) {
		if (err) {
			alert(err);
			return;
		}
		Ext.getCmp('tesultTextId').setValue(msg);
	});
};

var setDesc = function(key) {
	var desc = gmObject[key].desc;
	Ext.getCmp('gmCommandDescId').setText(desc);
};

var save = function() {
	var filename = Ext.getCmp('gmCommandNameId').getValue();
	if (!filename.match(/\.js$/)) {
		alert('the filename is required!');
		return;
	}

	var data = Ext.getCmp('gmCommandAreaId').getValue();

	window.parent.client.request('gmCommands', {
		command: 'save',
		filename: filename,
		body: data
	}, function(err, msg) {
		if (err) {
			alert(err);
			return;
		}
		alert('save success!');
		data = Ext.getCmp('gmCommandAreaId').setValue('');
	});
};