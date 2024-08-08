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
		fieldLabel: '选择类别',
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
		fieldLabel: '选择指令',
		labelWidth: 60,
		store: gmCommandStore,
		queryMode: 'local',
		displayField: 'gmCommand',
		valueField: 'name',
		margin: '0 0 0 20',
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

				columnWidth: .99
			},
			flagCom, gmCommandCom]
		}, {
			xtype: 'label',
			text: '指令参数：',
			height: 40,
			margin: '30 0 0 0',
			id: 'gmCommandDescId',
			anchor: '95%'
		}, {
			xtype: 'textareafield',
			height: 250,
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
				//margin: '10 300 10 0'
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
		for(let flag in flagObject){
			flags.push({
				name: flag,
				flagId: flag
			})
		}

		//初始化两个组件
		Ext.getCmp('flagComId').getStore().loadData(flags);
		flag = flags[0];
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
	var argsType = gmObject[command].argsType;
	if(argsType&& argsType.length > 1){
		var length = argsType.length
		const parts = args.split(' ', length);
		if(parts.length !== length){
			alert('指令参数输入个数不正确');
			return;
		}
		else{
			args = parts
		}
	} else{
		args = [args,]
	}
	window.parent.client.request('gmCommand', {
		command: command,
		args: args
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
	var argsType = gmObject[key].argsType;
	if(argsType&&argsType.length > 1){
		desc = desc + ', 参数类型：' + argsType + ', 多个参数按空格分割'
	}
	else{
		desc = desc + ', 输入参数：'
	}
	Ext.getCmp('gmCommandDescId').setText(desc);
};
