#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""飞书多维表格数据导出脚本"""

import os
import json
import time
import requests

# 从环境变量读取敏感信息（本地运行时设置环境变量，GitHub Actions从Secrets注入）
APP_ID = os.environ.get('LARK_APP_ID', 'cli_aa12fd541ef8dd2d')
APP_SECRET = os.environ.get('LARK_APP_SECRET', '')
BASE_TOKEN = os.environ.get('BASE_TOKEN', 'ElRPbCjVfaJfCQsJx8RcbvVynYb')

if not APP_SECRET:
    raise SystemExit('缺少 LARK_APP_SECRET 环境变量，请设置后再运行')

TABLES = {
    'jobs': {
        'table_id': 'tblhy4UgFFe7K7qp',
        'fields': ['公司名称', '行业大类', '企业性质', '工作地点', '官方公告', '更新时间', 
                   '招聘岗位', '截止时间', '是否需要笔试', '投递方式', '备注/提示', 
                   '招聘对象', '批次', '工作地点文本']
    },
    'majors': {
        'table_id': 'tbldviuIuB0GlZZv',
        'fields': ['专业名称', '适合的岗位和公司', '了解']
    },
    'platforms': {
        'table_id': 'tblXX7JUlB8BdQzl',
        'fields': ['官方平台', '央企', '地方社保局', '综合平台', '其他央企']
    },
    'resources': {
        'table_id': 'tblny6CXBwY3IkwB',
        'fields': ['资料名称', '详情']
    }
}

def get_tenant_access_token():
    url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal'
    data = {'app_id': APP_ID, 'app_secret': APP_SECRET}
    response = requests.post(url, json=data)
    result = response.json()
    if result.get('code') == 0:
        return result.get('tenant_access_token')
    else:
        raise Exception(f'获取token失败: {result}')

def get_table_records(token, table_id, page_size=200):
    records = []
    page_token = None
    while True:
        url = f'https://open.feishu.cn/open-apis/bitable/v1/apps/{BASE_TOKEN}/tables/{table_id}/records'
        headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
        params = {'page_size': page_size}
        if page_token:
            params['page_token'] = page_token
        response = requests.get(url, headers=headers, params=params)
        result = response.json()
        if result.get('code') != 0:
            raise Exception(f'获取记录失败: {result}')
        data = result.get('data', {})
        items = data.get('items', [])
        records.extend(items)
        if not data.get('has_more'):
            break
        page_token = data.get('page_token')
        time.sleep(0.1)
    return records

def extract_field_value(field_value):
    if field_value is None:
        return ''
    if isinstance(field_value, str):
        return field_value
    if isinstance(field_value, list):
        values = []
        for item in field_value:
            if isinstance(item, dict):
                if 'text' in item:
                    values.append(item['text'])
                elif 'link' in item:
                    values.append(item.get('text', item['link']))
                elif 'name' in item:
                    values.append(item['name'])
                else:
                    values.append(str(item))
            else:
                values.append(str(item))
        return values
    if isinstance(field_value, dict):
        if 'text' in field_value:
            return field_value['text']
        if 'link' in field_value:
            return field_value.get('text', field_value['link'])
        return str(field_value)
    return str(field_value)

def records_to_objects(records, fields):
    objects = []
    for record in records:
        fields_data = record.get('fields', {})
        obj = {}
        for field_name in fields:
            value = fields_data.get(field_name)
            obj[field_name] = extract_field_value(value)
        objects.append(obj)
    return objects

def main():
    print('正在获取飞书访问令牌...')
    token = get_tenant_access_token()
    print('令牌获取成功')
    
    os.makedirs('data', exist_ok=True)
    all_data = {}
    
    for key, config in TABLES.items():
        print(f'正在导出 {key}...')
        try:
            records = get_table_records(token, config['table_id'])
            objects = records_to_objects(records, config['fields'])
            all_data[key] = objects
            with open(f'data/{key}.json', 'w', encoding='utf-8') as f:
                json.dump(objects, f, ensure_ascii=False, indent=2)
            print(f'  已保存 {len(objects)} 条')
        except Exception as e:
            print(f'  导出失败: {e}')
    
    print('正在生成合并JS文件...')
    with open('data/all-data.js', 'w', encoding='utf-8') as f:
        for key in ['jobs', 'majors', 'platforms', 'resources']:
            if key in all_data:
                f.write(f'window.{key}Data = ')
                json.dump(all_data[key], f, ensure_ascii=False)
                f.write(';\n')
    
    summary = {
        'jobs_count': len(all_data.get('jobs', [])),
        'majors_count': len(all_data.get('majors', [])),
        'platforms_count': len(all_data.get('platforms', [])),
        'resources_count': len(all_data.get('resources', [])),
        'update_time': time.strftime('%Y-%m-%d %H:%M:%S')
    }
    with open('data/summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f'\n✅ 导出完成! 岗位:{summary["jobs_count"]} 专业:{summary["majors_count"]} 平台:{summary["platforms_count"]} 资料:{summary["resources_count"]}')

if __name__ == '__main__':
    main()
